export const openGhosttyWindow = `
tell application "System Events"
    set isGhosttyRunning to exists (processes where name is "Ghostty")
  end tell

tell application "Ghostty"
  if not isGhosttyRunning then
    activate
  else
    -- If Ghostty is already running, activate Finder first then activate Ghostty and send Cmd+N to create new window
    tell application "Finder" to activate
    activate
    tell application "System Events"
      tell process "Ghostty"
        keystroke "n" using {command down}
      end tell
    end tell
  end if
end tell`;

export const openGhosttyTab = `
tell application "System Events"
  set isGhosttyRunning to exists (processes where name is "Ghostty")
end tell

tell application "Ghostty"
  if not isGhosttyRunning then
    activate
  else
    -- If Ghostty is already running, activate Finder first then activate Ghostty and send Cmd+N to create new window
    tell application "Finder" to activate
    activate
    tell application "System Events"
      tell process "Ghostty"
        keystroke "t" using {command down}
      end tell
    end tell
  end if
end tell`;

export const openGhosttyWindowAtFinderLocation = `
on replaceTilde(theText)
	set AppleScript's text item delimiters to "~"
	set theTextItems to every text item of theText
	set AppleScript's text item delimiters to "~ "
	set newText to theTextItems as text
	set AppleScript's text item delimiters to "" -- Reset delimiters
	return newText
end replaceTilde

use F : application "Finder"
on getSelectedFolderPath()
	tell (F's selection as list) ¬
		to if (count) is 1 ¬
		and the first item's class is folder ¬
		then return the POSIX path ¬
		of (the first item as alias)
	
	return POSIX path of (F's insertion location as alias)
end getSelectedFolderPath

set currentPath to replaceTilde(quoted form of getSelectedFolderPath())

tell application "System Events"
	set isGhosttyRunning to exists (processes where name is "Ghostty")
end tell

tell application "Ghostty"
	if not isGhosttyRunning then
		activate
		tell application "System Events"
			tell process "Ghostty"
				delay 0.2
				keystroke "cd " & currentPath & " " & return
				keystroke "clear" & return
			end tell
		end tell
	else
		-- If Ghostty is already running, activate Finder first then activate Ghostty and send Cmd+N to create new window
		tell application "Finder" to activate
		activate
		tell application "System Events"
			tell process "Ghostty"
				keystroke "n" using {command down}
				delay 0.2
				keystroke "cd " & currentPath & " " & return
				keystroke "clear" & return
			end tell
		end tell
	end if
end tell`;
