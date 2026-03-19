import { runScript, tell } from "../apple-script";

export const search = (search: string) =>
  runScript(`
		set output to ""
			tell application "Music"
				set results to (search (library playlist 1) for "${search}")
				repeat with selectedTrack in results
					set output to output & "id=" & (id of selectedTrack) & "$BREAKname=" & (name of selectedTrack) & "$BREAKartist=" & (artist of selectedTrack) & "$BREAKalbum=" & (album of selectedTrack) & "$BREAKduration=" & (duration of selectedTrack) & "\\n"
				end repeat
			end tell
		return output
	`);

export const getAll = () =>
  runScript(`
    set output to ""
    tell application "Music"
      set allIds to id of every track of (library playlist 1)
      set allNames to name of every track of (library playlist 1)
      set allAlbums to album of every track of (library playlist 1)
      set allArtists to artist of every track of (library playlist 1)
      set allDurations to duration of every track of (library playlist 1)
      set trackCount to count of allIds
      repeat with i from 1 to trackCount
        set output to output & "id=" & (item i of allIds) & "$BREAKname=" & (item i of allNames) & "$BREAKartist=" & (item i of allArtists) & "$BREAKalbum=" & (item i of allAlbums) & "$BREAKduration=" & (item i of allDurations) & "\\n"
      end repeat
    end tell
    return output
  `);

export const play = (track: string) => tell("Music", `play track "${track}" of playlist 1`);

export const playById = (id: string) =>
  runScript(`
	tell application "Music"
		play (every track whose id is "${id}")
	end tell
`);
