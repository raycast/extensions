import { runScript } from '../apple-script';

export const search = (search: string) => runScript(`
	set output to ""
	set albumList to {}
	tell application "Music"
		set results to (every track of playlist 1 whose album contains "${search}" or artist contains "${search}")
		repeat with aTrack in results
			set albumName to the album of aTrack
			set trackCount to count (every track of playlist 1 whose album contains albumName)
			tell album of aTrack to if albumList does not contain it then
			set end of albumList to it
			set trackId to the id of aTrack
			set artistName to the artist of aTrack
			set output to output & "id: " & trackId & "&nbsp;name: " & albumName & "&nbsp;artist: " & artistName & "&nbsp;count: " & trackCount & "\n"
			end if
		end repeat
	end tell
	return output
`);

export const play = (album: string) =>
runScript(`
	tell application "Music"
		if (exists playlist "Raycast DJ") then
			delete playlist "Raycast DJ"
		end if
		make new user playlist with properties {name:"Raycast DJ", shuffle:false, song repeat:one}
		duplicate (every track of playlist 1 whose album contains "${album}") to playlist "Raycast DJ"
		play playlist "Raycast DJ"
	end tell
`);
