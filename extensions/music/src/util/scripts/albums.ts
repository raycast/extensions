import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { createQueryString, escapeAppleScriptString, NOT_IN_LIBRARY_ERROR, runScript } from "../apple-script";

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
  const escapedSearch = escapeAppleScriptString(search);
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
			set results to (every track of library playlist 1 whose (album contains "${escapedSearch}" or artist contains "${escapedSearch}"))
			repeat with aTrack in results
				set albumName to the album of aTrack
				set trackCount to count (every track of library playlist 1 whose album is albumName)
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

/** Play the library copy of a catalog album, matched by title + album artist
 * (falling back to track artist for libraries where album artist is unset).
 * Shares the "Raycast DJ" queue mechanism with `play`, but matches exactly —
 * `contains` would also catch same-named albums by other artists. */
export const playMatching =
  (shuffle = false) =>
  ({ title, artist }: { title: string; artist: string }) => {
    const albumName = escapeAppleScriptString(title);
    const artistName = escapeAppleScriptString(artist);
    return pipe(
      general.setShuffle(shuffle),
      TE.chain(() =>
        runScript(`
			tell application "Music"
				set albumTracks to (every track of library playlist 1 whose album is "${albumName}" and album artist is "${artistName}")
				if (count of albumTracks) = 0 then
					set albumTracks to (every track of library playlist 1 whose album is "${albumName}" and artist is "${artistName}")
				end if
				if (count of albumTracks) = 0 then error "Not found in library" number ${NOT_IN_LIBRARY_ERROR}
				if (exists playlist "Raycast DJ") then
					delete playlist "Raycast DJ"
				end if
				make new user playlist with properties {name:"Raycast DJ", shuffle:false, song repeat:one}
				-- Music accepts a direct (every track whose …) query as the
				-- duplicate source, but not the same tracks held in a list
				-- variable, so copy them one at a time.
				repeat with aTrack in albumTracks
					duplicate aTrack to playlist "Raycast DJ"
				end repeat
				play playlist "Raycast DJ"
			end tell
		`),
      ),
    );
  };
