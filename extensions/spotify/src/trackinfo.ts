import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `tell application "Spotify" to if running then
	set track_artist to artist of current track
	set track_name to name of current track
	set track_duration to duration of current track
	set seconds_played to player position
	set song_duration to (duration of current track) / 1000
	set song_duration_minutes to song_duration div minutes
	set song_duration_seconds to song_duration mod minutes div 1
	-- pad with 0 if necessary 
	if (count of ("" & song_duration_seconds)) is 1 then
		set song_duration_seconds to "0" & song_duration_seconds
	end if
	set player_position_minutes to (player position) div minutes
	set player_postition_seconds to (player position) mod minutes div 1
	-- pad with 0 if necessary
	if (count of ("" & player_postition_seconds)) is 1 then
		set player_postition_seconds to "0" & player_postition_seconds
	end if
	return track_artist & " - " & track_name & " - " & player_position_minutes & ":" & player_postition_seconds & " / " & song_duration_minutes & ¬
		":" & song_duration_seconds
else
	return "Spotify is not playing"
end if`;

const result = await runAppleScript(script);
console.log(result);

  await showHUD(result);
}
