export const appleMusic = `
if application "Music" is running then
  tell application "Music" to set playerState to (player state as text)

  if playerState is "playing" or playerState is "paused" then
    tell application "Music"
      return name of current track & " " & artist of current track
    end tell
  else
    return "NOT_PLAYING"
  end if
else
  return "NOT_RUNNING"
end if
`;
