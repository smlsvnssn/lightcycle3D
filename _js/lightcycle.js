//
// © 2012 lhli.net.
// Licence: http://creativecommons.org/licenses/by-sa/3.0/
//
$(function () {
	"use strict";
	var LightCycle = new function () {
		var levels = [
			new Level(0xffff00, ['c', 0, 0], 1, false), // human player
			new Level(0xff00ff, ['c', 0, 1], 3),
			new Level(0x00ffff, ['c', 1, 0], 2),
			new Level(0x00ff00, ['c', -1, 0], 4),
			new Level(0xff8000, ['c', -10, 10], 3),
			new Level(0xff0080, ['c', 10, 10], 2),
			new Level(0x00ff80, ['c', -10, -10], 4),
			new Level(0x80ff00, ['c', 10, -10], 1),
			new Level(0x0080ff, ['l', 10, -1], 2),
			new Level(0x8000ff, ['r', -10, -1], 4),
			new Level(0xffffff, ['u', 0, 0], 3)
		];
		var BONUS = 500;
		var level = 1;
		var metersTravelled = 0;
		var score = 0;
		var savedScore = 0;
		var width = 200;
		var height = 100;
		var paused = false;
		var running = false;
		var maze = new Maze();
		var renderer = new ThreeRenderer();
		var overview = new Overview();
		var $theScore = $('#theScore'), $theBonus = $('#theBonus');
		var loopIsPlaying = false;
		
		setupIntro();
		setupListeners();
		setupSound();

		function setupIntro() {
			$('#introWrapper').css({width: window.innerWidth, height: window.innerHeight});
			$('#intro')
				.css({left: (window.innerWidth/2)-($('#intro').width()/2), top: (window.innerHeight/2)-($('#intro').height()/2)})
				.fadeIn('slow')
				.find('a.enter').click(function (e) {
					e.preventDefault();
					$(this).parent().parent().fadeOut('slow');
					
					startGame();
				});
			$('body').css('background-color', '#333');
			$('header').show();
		}

		function setupListeners() {
			$('#actions')
				.on('playerScored', function(e) {
				  	score += level*10;
					updateScore();
				})
				.on('botDied', function(e) {
					playBoom();
				  	giveBonus(BONUS);
					renderer.playerSelfdestruct(e.player.index);
				})
				.on('endRound', function (e) {
					playBoom();
					endRound(e.player);
					renderer.playerSelfdestruct(e.player.index);
				});
			
			$('a#showHighscore').click(function (){
				getHighscores();
			});

			$(document).keydown(handleKeys);
			
			$(document).touchwipe({
				 wipeLeft: 	function () { maze.getHumanPlayer().setState(37); },
				 wipeRight:	function () { maze.getHumanPlayer().setState(39); },
				 wipeUp: 	function () { maze.getHumanPlayer().setState(40); },
				 wipeDown: 	function () { maze.getHumanPlayer().setState(38); },
				 min_move_x: 50,
				 min_move_y: 50,
				 preventDefaultEvents: true
			});
		}
		
		function setupSound() {
			soundManager.url = 'swf';
			soundManager.debugMode = false;

			soundManager.onready(function() {
				soundManager.createSound({ id: 'loop', url: 'LS/tack_for_kostymen_01.mp3' });
				soundManager.createSound({ id: 'boom', url: 'LS/boom.mp3', multiShot: true});	
			});
		}
		
		function playLoop() {
			if (!loopIsPlaying) {
				loopIsPlaying = true;
				soundManager.play('loop', {
				  onfinish:function() {
					loopIsPlaying = false;
				    playLoop();
				  }
				});
			}
		}
		
		function playBoom() {
			soundManager.play('boom', {	multiShot: true	});
		}
		
		function handleKeys(e) {			
			if (e.keyCode === 32) { // pause
				if (running && !paused) {
					paused = true;
					soundManager.pauseAll();
					$('#actions').html('GAME PAUSED');
				} else if (paused) {
					paused = false;
					soundManager.resumeAll();
					$('#actions').empty();
					maze.unPause();
				}
			} else if (e.keyCode === 13) { // fake link click
				var l = $('a:visible.enter');
				if (l.length > 0) l.click();
			} else if (e.keyCode >= 37 && e.keyCode <= 40 ) { // turn player
				try	{
					if (running) e.preventDefault();
					maze.getHumanPlayer().setState(e.keyCode);
				} catch (e){}
			} else if (e.keyCode === 77) {
				soundManager.toggleMute('loop');
				soundManager.toggleMute('boom');
			}
		}
		
		function endRound(player){
			var $actions = $('#actions');
			(function letAnimationFinish(i){
				if (i<50) requestAnimationFrame( function (){ letAnimationFinish(++i) })
				else running = false;
			})(0)
			if (player.isBot === false){
				revertScore();
				renderer.setCameraMode('lose');
				$actions.html('<a href="#" class="enter act">GAME OVER! Try again</a> <a href="#" class="highscore">Post highscore</a>');
				// level = 1;
			} else if (level < levels.length-1){
				//giveBonus(BONUS*level);
				giveBonus(metersTravelled*level);
				renderer.setCameraMode('win');
				$actions.html('<a href="#" class="enter act">You win! Continue to next level</a>');
				level++;
			} else {
				giveBonus(BONUS*4*level);
				renderer.setCameraMode('win');
				$actions.html('<a href="#" class="enter act">You have completed the game! Play again</a> <a href="#" class="highscore">Post highscore</a>');
				level = 1;
			}
			savedScore = score;
		
			$actions.find('a.enter').click(function (e) {
				e.preventDefault();
				(function checkIfAnimationIsFinished(){
					if (running) setTimeout(checkIfAnimationIsFinished, 10);
					else if (!paused) startGame();
				})();
			}).end()
			.find('a.highscore').click(function (e) {
				e.preventDefault();
				sendHighScore();
				$(this).hide();
			});
		}
		
		function updateScore() {
			$theScore.text(score);
		}
		
		function revertScore() {
			score = savedScore;
			$theScore.fadeOut('fast', function(){ $(this).html(score) }).fadeIn('fast');
		}
		
		function giveBonus(amount) {
			score += amount;
			$theBonus.show().text(amount+' BONUS!').delay(1000).fadeOut(2000);
			updateScore();
		}
		
		function sendHighScore() {
			var $sendHighScore = $('#sendHighscore');
			$sendHighScore.css({left: (window.innerWidth/2)-($sendHighScore.width()/2), top: (window.innerHeight/2)-($sendHighScore.height()/2)}).fadeIn('slow');
			
			$('#actions a.act').removeClass('enter');
			$sendHighScore.find('a').addClass('enter')
				.unbind().click(function (e) {
					e.preventDefault();
					if ($sendHighScore.find('input').val().length > 0){
						$.post('scoreoid_proxy.php', { action:'curl_request', method:'createScore', response:'XML', score: score,
							username: $sendHighScore.find('input').val(), difficulty: level}, 
							getHighscores);
					} else $sendHighScore.find('input').fadeOut('fast').fadeIn('fast').fadeOut('fast').fadeIn('fast');
				});
			$sendHighScore.find('input').focus().end()
			.find('#tweetButton').html(tweetButton());			
		}
		
		function getHighscores(){
			$('#sendHighscore').hide();
			$('#actions a.act').removeClass('enter');
			$('#highscore a').addClass('enter');
			
			$.post('scoreoid_proxy.php', { action:'curl_request', method:'getScores',  response:'XML', order_by: 'score', limit: '40'}, 
				function (data){
					var c = 0, checkDoubles = [], thisItem, table = '<table><tr><th>Player:</th><th>Score:</th><th>Date:</th></tr>';
					$(data).find('player').each(function (i){
						thisItem = [ $(this).attr('username'), $(this).find('score').attr('score'), $(this).find('score').attr('created') ];
						// hack to avoid double posting
						var isDouble = false;
						for (var i=0, l=checkDoubles.length; i < l; i++) {
							if(checkDoubles[i][0] === thisItem[0] && checkDoubles[i][1] === thisItem[1] ){
								isDouble = true;
								break;
							}
						};
						if (!isDouble) {
							checkDoubles.push(thisItem);
							table += '<tr><td>'+thisItem[0]
								+'</td><td>'+thisItem[1]
								+'</td><td>'+thisItem[2]
								+'</td></tr>';
							c++;
						};
						if (c >= 10) return false;
					});
					var $highscore = $('#highscore');
					$highscore.find('p').html(table+'</table>').end()
					.css({left: (window.innerWidth/2)-($highscore.width()/2), top: (window.innerHeight/2)-($highscore.height()/2)}).fadeIn('slow')
					.find('tr:even').addClass('even').end()
					.find('a').unbind().click(function (e) {
						e.preventDefault();
						$('#actions a.act').addClass('enter');
						$highscore.fadeOut('slow')
						.find('a').removeClass('enter');
					});
			});
		}
		
		function tweetButton() {
			return '<a href="https://twitter.com/intent/tweet?button_hashtag=lightCycle&text=I got '+score+' points in lightCycle3D™!" class="twitter-hashtag-button" data-url="http://lhli.net/lightcycle3D">Tweet #lightCycle</a><script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>'
		}

		function startGame() {
			running = true;
			if ( level === 1) score = 0;
			$('#actions').find('a').unbind().end().empty();
			$('#theLevel').html(level);
			updateScore();
			metersTravelled = 0;
		
			maze.clearPlayerList();
			for (var i=0; i < levels.length && i<=level; i++) {
				maze.addPlayer(new Player(renderer.materials[i], levels[i].isBot, i, levels[i].clr));
			};
			
			renderer.setCameraMode('game');
			renderer.clearBoard();
			overview.clearBoard();
			playLoop();
			maze.start();
			
		}

		function Level(clr, startpos, state, isBot) {
			this.clr = clr;
			this.startpos = startpos; // Array, [relative to (c,u,r,d,l), x, y]
			this.state = state;
			this.isBot = (isBot === true || isBot === undefined) ? true : false;
		}

		function Player(material, isBot, index, clr) {
			this.isBot = isBot;
			this.material = material;
			this.clr = clr.toHTMLColor();
			this.index = index;
			this.p = null;
			this.pp = new Pixel(null, null, null);
			this.state = null;
			this.turnLikeliness = Math.floor(Math.random()*100)+2;
			this.irrationalityFactor = Math.floor(Math.random()*25)+5;
			if (!this.isBot) {
				this.setState = function (key) {
					switch (key){
						// u,r,d,l
						case 37: if (this.pp.state != 2 && maze.getMatrix()[this.p.x-1][this.p.y].state === 0) this.state = 4; break;
						case 38: if (this.pp.state != 3 && maze.getMatrix()[this.p.x][this.p.y-1].state === 0) this.state = 1; break;
						case 39: if (this.pp.state != 4 && maze.getMatrix()[this.p.x+1][this.p.y].state === 0) this.state = 2; break;
						case 40: if (this.pp.state != 1 && maze.getMatrix()[this.p.x][this.p.y+1].state === 0) this.state = 3; break;
					}
				};
			};
		}

		function Pixel(x, y, state) {
			this.x = x;
			this.y = y;
			this.state = state;
		}

		function Maze() {
			var _matrix, _time, _firstRun, _width, _height;
			var _players = [];
			var _renderStack = [];
			var _pixelWidth = 5;
			var $actions = $('#actions');
			_width = width;
			_height = height;


			this.clearPlayerList = function () {
				_players = [];
			};
			
			this.getPlayers = function () {
				return _players;
			};

			this.getHumanPlayer = function () {
				return _players[0];
			};

			this.addPlayer = function (player) {
				_players.push(player);
			};
			
			this.getMatrix = function () {
				return _matrix;
			};
			
			this.unPause = function () {
				tick();
				render();
			};

			this.start = function () {
				_time = 40-(level*3);
				_firstRun = true;
				_matrix = (function () {
					var m = [];
					for (var x=0; x < _width; x++) { 
						m.push([]);
						for (var y=0; y < _height; y++) {
							m[x].push(new Pixel(x,y,0));
						};
					};
					return m;
				})();

				setStartPositions();
				tick();
				render();
			};

			function setStartPositions() {
				var centerx = Math.round(_width/2), centery = Math.round(_height/2);
				for (var i=0; i < _players.length; i++) {
					switch (levels[i].startpos[0]){
						case 'c': _players[i].p = _matrix[centerx + levels[i].startpos[1]][centery + levels[i].startpos[2]]; 	break;
						case 'u': _players[i].p = _matrix[centerx + levels[i].startpos[1]][levels[i].startpos[2]]; 				break;
						case 'r': _players[i].p = _matrix[_width + levels[i].startpos[1]][centery + levels[i].startpos[2]]; 	break;
						case 'd': _players[i].p = _matrix[centerx + levels[i].startpos[1]][_height + levels[i].startpos[2]]; 	break;
						case 'l': _players[i].p = _matrix[levels[i].startpos[1]][centery + levels[i].startpos[2]]; 				break;
						default: throw 'Undefined start position';
					}
					_players[i].pp.state = _players[i].state = levels[i].state;
					_players[i].pp.x = _players[i].p.x;
					_players[i].pp.y = _players[i].p.y;
				};
			}

			function tick() {
				//console.time('tick');
				if (_players[0].pp.state !== _players[0].state) {
					$actions.trigger({type:'playerScored'});
				};
				for (var i=0, player; i < _players.length; i++) {
					player = _players[i];
					if ( player.p === null || (player.p.state !== 0 && !_firstRun) ) {
						if (player.isBot && _players.length > 2) {
							$actions.trigger({type:'botDied', player: player});
							_players.splice(i,1);
							continue;
						};
						$actions.trigger({type:'endRound', player: player});
						return;
					};

					if (player.isBot){ 						
						player.p.state = getState(player);
					} else { 
						player.p.state = checkPlayerState(player.p, player.state);
					};

					_renderStack.push({
						p: player.p, 
						pp: player.pp, 
						player: player, 
						firstRun: _firstRun
					});

					player.pp = player.p;
					player.p = setNextPixel(player.p);
				};
				metersTravelled++;
				_firstRun = false;
				//console.timeEnd('tick');
				
				if (!paused) setTimeout(tick, _time);
			}

			function getState(player) {
				if (Math.floor(Math.random()*player.turnLikeliness) !== 0 && checkPlayerState(player.p, player.pp.state) !== -1) return player.pp.state; // continue 
				var states = [1,2,3,4], points = [], highest = 0, s;
				if (Math.floor(Math.random()*player.irrationalityFactor) === 0) { // act stooopid
					while (true) {
						if (states.length > 0) { 
							var state = states[Math.floor(Math.random()*states.length)];
							states.splice(states.indexOf(state),1);
						} else return -1;
						s = checkPlayerState(player.p, state);
						if (s > 0) return s;
					} return -1;
				} else { // act clever
					for (var i=0; i < 4; i++) {
						points.push(checkDistanceToObstacle(player.p, states[i], 0));
					};
					for (var i=0; i < 4; i++) {
						highest = (points[i] > highest) ? points[i] : highest;
					};
					return (highest === 0) ? -1: states[points.indexOf(highest)];
				}
			}

			function checkDistanceToObstacle(p, state, distance) {
				try {
					switch (state){
						case 1: p = _matrix[p.x][p.y-1]; break; 
						case 2: p = _matrix[p.x+1][p.y]; break; 
						case 3: p = _matrix[p.x][p.y+1]; break; 
						case 4: p = _matrix[p.x-1][p.y]; break;
					}
				} catch (e) { return distance; }
				if (p !== undefined && p.state === 0) {
					return checkDistanceToObstacle(p, state, ++distance);
				};
				return distance;
			}

			function checkPlayerState(p, state) {
				try	{
					switch (state){
						case 1: if (_matrix[p.x][p.y-1].state === 0) return state; break; 
						case 2: if (_matrix[p.x+1][p.y].state === 0) return state; break; 
						case 3: if (_matrix[p.x][p.y+1].state === 0) return state; break; 
						case 4: if (_matrix[p.x-1][p.y].state === 0) return state; break;
					}
				} catch (e) { return -1; }
				return -1;
			}

			function setNextPixel(p) {
				switch (p.state){
					case 1: return _matrix[p.x][p.y-1];
					case 2: return _matrix[p.x+1][p.y];
					case 3: return _matrix[p.x][p.y+1];
					case 4: return _matrix[p.x-1][p.y];
					default: return null;
				}
			}
			
			function render() {
				//console.time('render');
				renderer.render(_renderStack);
				overview.render(_renderStack);
				_renderStack = [];
				if (!paused && running) requestAnimationFrame( render ); //setTimeout(render, 1000/60);
				//console.timeEnd('render');
			}
		}
		
		function ThreeRenderer() {
			if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

			var container, camera, scene, renderEngine, basicPlane, gameboard, players, cameraPosition, cameraMode, grid, starfield;
		
			container = document.getElementById( 'maze' );
			renderEngine = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: true } );
			renderEngine.setSize( window.innerWidth-10, window.innerHeight-10-$('header').height() );
			renderEngine.autoClear = false;
			container.appendChild( renderEngine.domElement );

			scene = new THREE.Scene();

			camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
			scene.add(camera);
			
			setupLights();
			
			gameboard = new THREE.Object3D();
			scene.add(gameboard);
			
			grid = new THREE.Mesh( new THREE.PlaneGeometry( width, height, 1, 1), new THREE.MeshBasicMaterial( { color: 0x1f1f1f }) );
			grid.position.set( -.5, .5, -.5 );
			scene.add( grid );
			
			basicPlane = new THREE.PlaneGeometry( 1, 1, 1, 1);
			
			this.materials = (function () {
				for (var i=0, m = []; i < levels.length; i++) {
					m.push(new THREE.MeshPhongMaterial( { color: levels[i].clr }));
				};
				return m;
			})();
			
			this.clearBoard = function () {
				scene.remove(gameboard);
				gameboard = new THREE.Object3D();
				scene.add(gameboard);
				cameraPosition = (function () {
					for (var i=30, m = []; i > 0; i--) {
						m.push(new Pixel(i+(width/2),i+(height/2),0));
					};
					return m;
				})();
				camera.position.z = 5;

				players = new THREE.Object3D();
				for (var i=0; i < maze.getPlayers().length; i++) {
					players.add( motorCycle(maze.getPlayers()[i].material) );
				};
				gameboard.add(players);	
			}
			
			this.setCameraMode = function (mode){
				cameraMode = mode;
			}
			
			this.playerSelfdestruct = function(index){
				players.children[index].explode();
			}
			
			this.render = function (stack) {
				for (var i=0, stackItem, currentPlayer, l = stack.length, object; i < l; i++) {
					stackItem = stack[i];
					currentPlayer = players.children[stackItem.player.index];
					
					if (currentPlayer.doTurn) {
						turnPlayer(stackItem, currentPlayer);
						currentPlayer.doTurn = false;
					} else {
						switch (stackItem.pp.state){
							// u,r,d,l
							case 1: currentPlayer.currentMesh.position.y += .5; break;
							case 2: currentPlayer.currentMesh.position.x += .5;	break;
							case 3: currentPlayer.currentMesh.position.y -= .5;	break;
							case 4: currentPlayer.currentMesh.position.x -= .5;	break;
							default: return null;
						}
						if (!(stackItem.pp.state % 2)) currentPlayer.currentMesh.scale.x += 1;
					 	else currentPlayer.currentMesh.scale.y += 1;
					}
					
					if (stackItem.p.state !== stackItem.pp.state) {
						// delay turn for one round	
						currentPlayer.doTurn = true;
					}
				
					// set bike position
					currentPlayer.position.set( stackItem.p.x-(width/2), -stackItem.p.y+(height/2), 0 );
					
					if (!stackItem.player.isBot) {
						cameraPosition.push(stackItem.p);
						if (cameraPosition.length > 30) cameraPosition.shift();
					};
				};
								
				handleCamera();

				renderEngine.render( scene, camera );
			}
			
			function turnPlayer(stackItem, currentPlayer) {
				currentPlayer.currentMesh = new THREE.Mesh( basicPlane, stackItem.player.material );
				currentPlayer.currentMesh.doubleSided = true;
				
				// set start positions
				if (stackItem.firstRun){					
					currentPlayer.currentMesh.position.set( stackItem.p.x-(width/2), -stackItem.p.y+(height/2), 0 );
					if (!(stackItem.pp.state % 2))	currentPlayer.currentMesh.scale.x = 0;
					else currentPlayer.currentMesh.scale.y = 0;
				} else {
					currentPlayer.currentMesh.position.set( ((stackItem.p.x+stackItem.pp.x)/2)-(width/2), (-(stackItem.p.y+stackItem.pp.y)/2)+(height/2), 0 );
				}
				if (!(stackItem.pp.state % 2)) {
					currentPlayer.currentMesh.rotation.x = Math.PI/2;
				} else {
					currentPlayer.currentMesh.rotation.y = Math.PI/2;
				}
				// set player rotation
				switch (stackItem.p.state){
					case 1: currentPlayer.rotation.z = Math.PI*1.5; break;
					case 2: currentPlayer.rotation.z = Math.PI;		break;
					case 3: currentPlayer.rotation.z = Math.PI/2;	break;
					case 4: currentPlayer.rotation.z = 0;			break;
					default: return null;
				}
				
				gameboard.add( currentPlayer.currentMesh );
			}
			
			function handleCamera(){
				switch (cameraMode){
					case 'game':
						camera.position.x = ((cameraPosition[0].x+cameraPosition[cameraPosition.length-1].x)/2)-(width/2)+10.5;
						camera.position.y = (-(cameraPosition[0].y+cameraPosition[cameraPosition.length-1].y)/2)+(height/2)-40.5;
						camera.position.z = (camera.position.z < 25) ? camera.position.z+.25 :camera.position.z;
						camera.lookAt( players.children[ 0 ].position );
						break;
					case 'win':
						var loser = maze.getPlayers()[maze.getPlayers().length-1].index;
						camera.position.x = ( players.children[ loser ].position.x+10.5 );
						camera.position.y = ( players.children[ loser ].position.y-20.5 );
						camera.position.z = (camera.position.z > 10) ? camera.position.z-(camera.position.z/50) :camera.position.z;
						camera.lookAt( players.children[ loser ].position );
						break;
					case 'lose':
						camera.position.x = ((cameraPosition[0].x+cameraPosition[cameraPosition.length-1].x)/2)-(width/2)+10.5;
						camera.position.y = players.children[ 0 ].position.y-20.5;
						camera.position.z = (camera.position.z > 10) ? camera.position.z-(camera.position.z/50) :camera.position.z;
						camera.lookAt( players.children[ 0 ].position );
						break;
					case 'dev':
						camera.position.x = ((cameraPosition[0].x+cameraPosition[cameraPosition.length-1].x)/2)-(width/2)+10.5;
						camera.position.y = (-(cameraPosition[0].y+cameraPosition[cameraPosition.length-1].y)/2)+(height/2)-10.5;
						camera.position.z = (camera.position.z < 5) ? camera.position.z+.25 :camera.position.z;
						camera.lookAt( players.children[ 0 ].position );
						break;
					default: throw 'Undefined camera mode';
				}
				camera.rotation.z = 0; 
			}
			
			function setupLights() {
				var light;
				//scene.add( new THREE.AmbientLight( 0x1f1f1f ) );

				light = new THREE.DirectionalLight( 0x999999 );
				light.position.set( 1, 0, .1 ); // r
				scene.add( light );
				
				light = new THREE.DirectionalLight( 0xcccccc );
				light.position.set( -1, 0, .1 ); // l
				scene.add( light );

				light = new THREE.DirectionalLight( 0x666666 );
				light.position.set( 0, 1, .1 ); // u
				scene.add( light );

				light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( 0, -1, .1 ); // b
				scene.add( light );
			}
			
			function motorCycle(material) {
				var mc = new THREE.Object3D();
				var offsetx = -.4;
				//wheels
				var obj = new THREE.Mesh( new THREE.TorusGeometry( .7, .4, 8, 15 ), new THREE.MeshPhongMaterial( { color: 0x333333 } ) );
				obj.rotation.x = (Math.PI/2);
				obj.position.set( 0-offsetx, 0, 0 );
				mc.add(obj);
				var obj = new THREE.Mesh( new THREE.TorusGeometry( .7, .4, 8, 15 ), new THREE.MeshPhongMaterial( { color: 0x333333 } ) );
				obj.rotation.x = (Math.PI/2);
				obj.position.set( 3-offsetx, 0, 0 );
				mc.add(obj);
				//head
				obj = new THREE.Mesh( new THREE.SphereGeometry( .5, 9, 9 ), new THREE.MeshPhongMaterial( { color: 0xffffff } ) );
				obj.position.set( .7-offsetx, 0, 1.55 );
				mc.add(obj);
				//obj = new THREE.Mesh( new THREE.SphereGeometry( .47, 9, 9 ), new THREE.MeshPhongMaterial( { color: 0x111111 } ) );
				obj = new THREE.Mesh( new THREE.TorusGeometry( .22, .3, 9, 10 ), new THREE.MeshPhongMaterial( { color: 0x111111 } ) );
				obj.position.set( .65-offsetx, 0, 1.52 );
				mc.add(obj);
				//torso
				obj = new THREE.Mesh( new THREE.CubeGeometry( 1.7, .5, .5, 1, 1, 1 ), material );
				obj.rotation.y = (Math.PI/180)*20;
				obj.position.set( 1.5-offsetx, 0, 1.1 );
				mc.add(obj);
				//legs
				obj = new THREE.Mesh( new THREE.CubeGeometry( 1.4, .5, .5, 1, 1, 1 ), material );
				obj.rotation.y = (Math.PI/180)*320;
				obj.position.set( 1.8-offsetx, 0, .5 );
				mc.add(obj);
				obj = new THREE.Mesh( new THREE.CubeGeometry( 1.4, .5, .5, 1, 1, 1 ), material );
				obj.position.set( 1.8-offsetx, 0, 0 );
				mc.add(obj);
				//arms
				obj = new THREE.Mesh( new THREE.CubeGeometry( 1.2, .5, .5, 1, 1, 1 ), material );
				obj.rotation.y = (Math.PI/180)*60;
				obj.position.set( 1-offsetx, 0, 1 );
				mc.add(obj);
				obj = new THREE.Mesh( new THREE.CubeGeometry( 1, .5, .5, 1, 1, 1 ), material );
				obj.rotation.y = (Math.PI/180)*340;
				obj.position.set( .9-offsetx, 0, .5 );
				mc.add(obj);

				mc.currentMesh = null;
				mc.doTurn = true;
				
				mc.explode = function (){
					// add some boom
					var boom = new THREE.Object3D(), m = new THREE.MeshPhongMaterial( { color: 0xcccccc, transparent: true, opacity: 1} );
					for (var i=0, mesh; i < 3; i++) {
						mesh = new THREE.Mesh(new THREE.SphereGeometry( i+1, 5, 5 ), m );
						boom.add(mesh);
					};
					mesh = new THREE.Mesh(new THREE.TorusGeometry( 4, 1.8, 5, 8 ), m );
					boom.add(mesh);
					this.add(boom);
					
					for (var i=0; i < this.children.length-1; i++) {
						this.children[i].directions = {
							rx: (Math.random()-.5),
							ry: (Math.random()-.5),
							rz: (Math.random()-.5),
							dx: (Math.random()-.9),
							dy: (Math.random()-.5),
							dz: Math.random()/2				
						}
					};
					
					function doExplosion (c, context) {
						for (var i=0, item; i < context.children.length-1; i++) {
							item = context.children[i];
							item.rotation.x += item.directions.rx;
							item.rotation.y += item.directions.ry;
							item.rotation.z += item.directions.rz;
							item.position.x += item.directions.dx;
							item.position.y += item.directions.dy;
							item.position.z += item.directions.dz;
							if (c>40) item.scale.x = item.scale.y = item.scale.z -= item.scale.x/2;
							
						};
						for (var i=0; i < context.children[context.children.length-1].children.length; i++) {
							item = context.children[context.children.length-1].children[i];
							item.scale.x = item.scale.y = item.scale.z += item.scale.x/50+(i/100);
							item.material.opacity -= .005;
						};

						if (c<50) requestAnimationFrame( function (){
							doExplosion(++c, context);
						} );
					}
					doExplosion(0, this);
				}

				mc.scale.set(.5, .5, .5);
				return mc;
			}
		}
		
		function Overview() {
			var _c = document.getElementById("overview").getContext("2d");
			_c.lineWidth = 1;
			this.clearBoard = function () {
				_c.clearRect(0,0,_c.canvas.width,_c.canvas.height);
			}
			this.render = function (stack) {
				for (var i = 0, l = stack.length, item; i < l; i++) {
					item = stack[i];
					_c.strokeStyle = item.player.clr;
					_c.beginPath();
					_c.moveTo(item.pp.x+.5, item.pp.y+.5);
					_c.lineTo(item.p.x+.5, item.p.y+.5);
					_c.closePath();
					_c.stroke();
				};	
			}
		}
	};
});

Number.prototype.toHTMLColor = function () {
    return "#000000".substring(0,7 - this.toString(16).length) + this.toString(16);
}