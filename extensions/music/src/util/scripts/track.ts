import { createQueryString, runScript, tell } from "../apple-script";

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
				set results to (search (library playlist 1) for "${search}")
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

export const play = (track: string) => tell("Music", `play track "${track}" of playlist 1`);

export const playById = (id: string) =>
  runScript(`
	tell application "Music"
		play (every track whose id is "${id}")
	end tell
`);
