-- Counts the rows named "Rexcast" in Raycast Settings, after filtering the search box by "Rexcast".
-- Aborts if Raycast is not frontmost. Prints the number.
tell application "Raycast" to activate
delay 1
tell application "System Events"
  if (name of first process whose frontmost is true) is not "Raycast" then return "ABORT: Raycast not frontmost"
  tell process "Raycast"
    if not (exists window "Settings") then
      keystroke "," using command down
      delay 1.5
    end if
    click at {675, 169}
    delay 0.4
    keystroke "a" using command down
    keystroke "Rexcast"
    delay 1.5
    set n to 0
    repeat with e in (entire contents of window "Settings")
      try
        if (class of e is button) and (name of e is "Rexcast") then set n to n + 1
      end try
    end repeat
    return n
  end tell
end tell
