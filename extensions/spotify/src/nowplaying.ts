import {runAppleScript} from 'run-applescript';

export default async () => {
    const result = await runAppleScript(`
    if application "Spotify" is running and application "Music" is not running then
	tell application "Spotify"
		if player state is stopped then
			log "No Track Playing"
		else
			set track_artist to artist of current track
			set track_name to name of current track
			set track_duration to duration of current track
			set seconds_played to player position
			set state to ""
			if player state is paused then
				set state to "(Paused) "
			end if
			
			log state & track_artist & " - " & track_name & " - " & "Spotify"
		end if
	end tell
else if application "Spotify" is running and application "Music" is running then
	--Get current states of iTunes and Spotify
	tell application "Music" to set itunesState to (player state as text)
	tell application "Spotify" to set spotifyState to (player state as text)
	
	if (itunesState is "paused" or itunesState is "stopped") and spotifyState is "playing" then
		tell application "Spotify"
			if player state is stopped then
				log "No Track Playing"
			else
				set track_artist to artist of current track
				set track_name to name of current track
				set track_duration to duration of current track
				set seconds_played to player position
				set state to ""
				if player state is paused then
					set state to "(Paused) "
				end if
				
				log state & track_artist & " - " & track_name & " - " & "Spotify"
			end if
		end tell
	else if itunesState is "playing" and (spotifyState is "paused" or spotifyState is "stopped") then
		tell application "Music"
			if player state is stopped then
				log "No Track Playing"
			else
				set track_artist to artist of current track
				set track_name to name of current track
				set track_duration to duration of current track
				set seconds_played to player position
				set state to ""
				if player state is paused then
					set state to "(Paused) "
				end if
				
				log state & track_artist & " - " & track_name & " - " & "Music"
			end if
		end tell
	else if (itunesState is "paused" or itunesState is "stopped") and spotifyState is "paused" then
		log "No Track Playing"
	else
		log "Crazyman!!!!"
	end if
else if application "Music" is running and application "Spotify" is not running then
	tell application "Music"
		if player state is stopped then
			set display to "No Track Playing"
		else
			set track_artist to artist of current track
			set track_name to name of current track
			set track_duration to duration of current track
			set seconds_played to player position
			set state to ""
			if player state is paused then
				set state to "(Paused) "
			end if
			
			log state & track_artist & " - " & track_name & " - " & "Music"
		end if
	end tell
else
	log "No music app is running"
end if`);
console.log(result);
    };