#@osa-lang:AppleScript
tell application "Finder"
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to "::"
	set theSelection to selection
	if theSelection is {} then
		return
	else if (theSelection count) is equal to 1 then
		return the POSIX path of (theSelection as alias)
	else
		set thePaths to {}
		repeat with i from 1 to (theSelection count)
			copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
		end repeat
		set thePathsString to thePaths as text
		set AppleScript's text item delimiters to oldDelimiters
		return thePathsString
	end if
end tell