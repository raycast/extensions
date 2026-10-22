import { createQueryString, escapeAppleScriptString, NOT_IN_LIBRARY_ERROR, runScript, tell } from "../apple-script";

export const search = (search: string) => {
  const outputQuery = createQueryString({
    id: "trackId",
    name: "trackName",
    artist: "artistName",
    album: "albumName",
    duration: "trackDuration",
  });

  return runScript(`
		set output to ""
			tell application "Music"
				set results to (search (library playlist 1) for "${escapeAppleScriptString(search)}")
				repeat with selectedTrack in results
					set trackId to the id of selectedTrack
					set trackName to the name of selectedTrack
					set albumName to the album of selectedTrack
					set artistName to the artist of selectedTrack
					set trackDuration to the duration of selectedTrack
					set output to output & ${outputQuery} & "\n"
				end repeat
			end tell
		return output
	`);
};

export const getAll = () =>
  runScript(`
    set output to ""
    tell application "Music"
      set results to (every track of (library playlist 1))
      repeat with selectedTrack in results
        set trackId to the id of selectedTrack
        set trackName to the name of selectedTrack
        set albumName to the album of selectedTrack
        set artistName to the artist of selectedTrack
        set trackDuration to the duration of selectedTrack
        set output to output & "id=" & trackId & "$BREAKname=" & trackName & "$BREAKartist=" & artistName & "$BREAKalbum=" & albumName & "$BREAKduration=" & trackDuration & "\n"
      end repeat
    end tell
    return output
  `);

export const play = (track: string) => tell("Music", `play track "${escapeAppleScriptString(track)}" of playlist 1`);

export const playById = (id: string) =>
  runScript(`
	tell application "Music"
		play (every track whose id is "${escapeAppleScriptString(id)}")
	end tell
`);

/** Play the library copy of a catalog song. The AppleScript bridge exposes no
 * catalog ids, so the linkage the API reports is re-derived by metadata:
 * title + artist + album first, then title + artist in case the library
 * holds a different edition of the album. */
export const playMatching = ({ title, artist, album }: { title: string; artist: string; album: string }) => {
  const name = escapeAppleScriptString(title);
  const artistName = escapeAppleScriptString(artist);
  const albumName = escapeAppleScriptString(album);
  return runScript(`
	tell application "Music"
		set matches to (every track of library playlist 1 whose name is "${name}" and artist is "${artistName}" and album is "${albumName}")
		if (count of matches) = 0 then
			set matches to (every track of library playlist 1 whose name is "${name}" and artist is "${artistName}")
		end if
		if (count of matches) = 0 then error "Not found in library" number ${NOT_IN_LIBRARY_ERROR}
		play (item 1 of matches)
	end tell
`);
};
