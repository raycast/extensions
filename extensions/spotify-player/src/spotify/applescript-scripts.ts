/* eslint-disable no-useless-escape */

export default {
  state: (applicationName: string) => `tell application "${applicationName}"
  set cstate to "{"
  set cstate to cstate & "\\"track_id\\": \\"" & current track's id & "\\""
  set cstate to cstate & ",\\"volume\\": " & sound volume
  set cstate to cstate & ",\\"position\\": " & (player position as integer)
  set cstate to cstate & ",\\"state\\": \\"" & player state & "\\""
  set cstate to cstate & "}"

  return cstate
end tell`,
  track: (applicationName: string) => `on escape_quotes(string_to_escape)
  set AppleScript's text item delimiters to the "\\""
  set the item_list to every text item of string_to_escape
  set AppleScript's text item delimiters to the "\\\\\\""
  set string_to_escape to the item_list as string
  set AppleScript's text item delimiters to ""
  return string_to_escape
end escape_quotes

tell application "${applicationName}"
  set ctrack to "{"
  set ctrack to ctrack & "\\"artist\\": \\"" & my escape_quotes(current track's artist) & "\\""
  set ctrack to ctrack & ",\\"album\\": \\"" & my escape_quotes(current track's album) & "\\""
  set ctrack to ctrack & ",\\"disc_number\\": " & current track's disc number
  set ctrack to ctrack & ",\\"duration\\": " & current track's duration
  set ctrack to ctrack & ",\\"played_count\\": " & current track's played count
  set ctrack to ctrack & ",\\"track_number\\": " & current track's track number
  set ctrack to ctrack & ",\\"popularity\\": " & current track's popularity
  set ctrack to ctrack & ",\\"id\\": \\"" & current track's id & "\\""
  set ctrack to ctrack & ",\\"name\\": \\"" & my escape_quotes(current track's name) & "\\""
  set ctrack to ctrack & ",\\"album_artist\\": \\"" & my escape_quotes(current track's album artist) & "\\""
  set ctrack to ctrack & ",\\"artwork_url\\": \\"" & current track's artwork url & "\\""
  set ctrack to ctrack & ",\\"spotify_url\\": \\"" & current track's spotify url & "\\""
  set ctrack to ctrack & "}"
end tell`,
  volumeUp: (applicationName: string) => `on min(x, y)
  if x ≤ y then
    return x
  else
    return y
  end if
end min

tell application "${applicationName}" to set sound volume to (my min(sound volume + 10, 100))`,
  volumeDown: (applicationName: string) => `on max(x, y)
  if x ≤ y then
    return y
  else
    return x
  end if
end max

tell application "${applicationName}" to set sound volume to (my max(sound volume - 10, 0))`,
  setVolume: (applicationName: string, volume: number) =>
    `tell application "${applicationName}" to set sound volume to ${volume}`,
  play: `play`,
  playTrack: (applicationName: string, trackId: string) =>
    `tell application "${applicationName}" to play track "${trackId}"`,
  playTrackInContext: (applicationName: string, trackId: string, context: string) =>
    `tell application "${applicationName}" to play track "${trackId}" in context "${context}"`,
  playPause: `playpause`,
  pause: `pause`,
  next: `next track`,
  previous: `previous track`,
  jumpTo: (applicationName: string, position: number) =>
    `tell application "${applicationName}" to set player position to ${position}`,
  isRunning: (applicationName: string) => `get running of application "${applicationName}"`,
  isRepeating: (applicationName: string) => `tell application "${applicationName}" to return repeating`,
  isShuffling: (applicationName: string) => `tell application "${applicationName}" to return shuffling`,
  setRepeating: (applicationName: string, repeating: boolean) =>
    `tell application "${applicationName}" to set repeating to ${repeating}`,
  setShuffling: (applicationName: string, shuffling: boolean) =>
    `tell application "${applicationName}" to set shuffling to ${shuffling}`,
  toggleRepeating: (applicationName: string) => `tell application "${applicationName}"
  if repeating then
    set repeating to false
  else
    set repeating to true
  end if
end tell`,
  toggleShuffling: (applicationName: string) => `tell application "${applicationName}"
  if shuffling then
    set shuffling to false
  else
    set shuffling to true
  end if
end tell`,
};
