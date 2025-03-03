import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { createQueryString, runScript } from "../apple-script";

import { general } from ".";

export const getAll = runScript(`
	set output to ""
	set albumList to {}
	tell application "Music"
		set results to (every track of playlist 1)
		repeat with aTrack in results
			set albumName to the album of aTrack
			set trackCount to count (every track of playlist 1 whose album contains albumName)
			tell album of aTrack to if albumList does not contain it then
				set end of albumList to it
				set trackId to the id of aTrack
				set artistName to the artist of aTrack
				set output to output & ${createQueryString({
          id: "trackId",
          name: "albumName",
          artist: "artistName",
          count: "trackCount",
        })} & "\n"
			end if
		end repeat
	end tell
	return output
`);

export const search = (search: string) => {
  const query = createQueryString({
    id: "trackId",
    name: "albumName",
    artist: "artistName",
    count: "trackCount",
  });

  return runScript(`
		set output to ""
		set albumList to {}
		tell application "Music"
			set results to (search (library playlist 1) for "${search}")
			repeat with aTrack in results
				set albumName to the album of aTrack
				set trackCount to count (every track of playlist 1 whose album contains albumName)
				tell album of aTrack to if albumList does not contain it then
					set end of albumList to it
					set trackId to the id of aTrack
					set artistName to the artist of aTrack
					set output to output & ${query} & "\n"
				end if
			end repeat
		end tell
		return output
	`);
};

export const play =
  (shuffle = false) =>
  (album: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() =>
        runScript(`
			tell application "Music"
				if (exists playlist "Raycast DJ") then
					delete playlist "Raycast DJ"
				end if
				make new user playlist with properties {name:"Raycast DJ", shuffle:false, song repeat:one}
				duplicate (every track of playlist 1 whose album contains "${album}") to playlist "Raycast DJ"
				play playlist "Raycast DJ"
			end tell
		`),
      ),
    );
