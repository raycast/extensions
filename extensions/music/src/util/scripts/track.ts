import { runScript, tell } from '../apple-script';

export const search = (search: string) => runScript(`
	set output to ""
		tell application "Music"
			set results to (every track whose name contains "${search}" or artist contains "${search}")
			repeat with selectedTrack in results
				set trackId to the id of selectedTrack
				set trackName to the name of selectedTrack
				set albumName to the album of selectedTrack
				set artistName to the artist of selectedTrack
				set trackDuration to the duration of selectedTrack
				set output to output & "id: " & trackId & "&nbsp;name: " & trackName & "&nbsp;artist: " & artistName & "&nbsp;album: " & albumName & "&nbsp;duration: " & trackDuration & "\n"
			end repeat
		end tell
	return output
`);

export const play = (track: string) => tell("Music", `play track "${track}" of playlist 1`);
