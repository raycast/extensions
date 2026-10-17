#!/usr/bin/osascript

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Search on Discogs
# @raycast.mode compact

# Optional parameters:
# @raycast.icon images/discogs-record-icon.png
# @raycast.iconDark images/discogs-record-icon_dark.png

# Documentation:
# @raycast.author FL0R1AN
# @raycast.authorURL https://raycast.com/FL0R1AN

tell application "Music"
	set musicArtist to artist of current track
	set musicName to name of current track
	
	-- Remove unwanted characters from the artist name
	set musicArtist to my replace(" & ", " ", musicArtist)
	set musicArtist to my replace(";", "", musicArtist)
	
	tell application "Safari"
		activate
		open location "https://www.discogs.com/search?q=" & musicArtist & "+" & musicName
	end tell
end tell

on replace(oldText, newText, sourceText)
	set {oldTIDs, AppleScript's text item delimiters} to {AppleScript's text item delimiters, oldText}
	set sourceText to text items of sourceText
	set AppleScript's text item delimiters to newText
	set sourceText to sourceText as text
	set AppleScript's text item delimiters to oldTIDs
	return sourceText
end replace

