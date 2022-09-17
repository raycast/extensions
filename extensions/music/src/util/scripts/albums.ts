import { runAppleScript } from "run-applescript";

import { Album } from "../models";

export const show = async (album: Album) => {
  await runAppleScript(`
	tell application "Music" 
      reveal track 1 of (every track of playlist 1 whose album is "${album.name}" and artist is "${album.artist}")
	  activate
	end tell
  `);
};

export const play = async (album: Album) => {
  await runAppleScript(`
	tell application "System Events"
	  set activeApp to name of first application process whose frontmost is true
	end tell
	tell application "Music" 
      reveal track 1 of (every track of playlist 1 whose album is "${album.name}" and artist is "${album.artist}")
	  activate
	  tell application "System Events" to key code 36
	end tell
	tell application activeApp to activate
  `);
};

export const shuffle = async (album: Album) => {
  const numTracks = await runAppleScript(`
  	tell application "Music" to count (every track of playlist 1 whose album is "${album.name}" and artist is "${album.artist}")
  `);
  const random = Math.floor(Math.random() * parseInt(numTracks)) + 1;
  await runAppleScript(`
	tell application "System Events"
	  set activeApp to name of first application process whose frontmost is true
	end tell
    tell application "Music" 
	  set song repeat to all
	  set shuffle enabled to true
	  reveal track ${random} of (every track of playlist 1 whose album is "${album.name}" and artist is "${album.artist}")
	  activate
	  tell application "System Events" to key code 36
	end tell
	tell application activeApp to activate
  `);
};
