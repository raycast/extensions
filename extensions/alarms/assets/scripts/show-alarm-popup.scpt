on run argv
  -- Parse arguments
  if length of argv < 2 then
    display dialog "Missing required arguments" buttons {"OK"} default button "OK"
    return
  end if
  set alarmId to item 1 of argv
  set alarmTitle to item 2 of argv
  
  -- Set dialog appearance  
  set dialogTitle to "⏰ Alarm: " & alarmTitle
  set dialogMessage to "Your alarm is ringing! Click Stop to silence the alarm."
  
  -- Calculate center position for the dialog
  tell application "Finder"
    set screenWidth to bounds of window of desktop
  end tell
  
  set screenWidth to item 3 of screenWidth
  set screenHeight to item 4 of screenWidth
  
  -- Create dialog
  tell application "System Events"
    -- Bring dialog to front by activating the script
    set frontmost of process "osascript" to true
  end tell
  
  -- Display dialog with stop button
  set dialogResult to display dialog dialogMessage with title dialogTitle buttons {"Stop"} default button "Stop" with icon stop giving up after 60
  
  -- Handle button clicks
  if button returned of dialogResult is "Stop" then
    -- Stop the sound by killing the process
    set pidFile to (path to home folder as text) & ".raycast-alarms/active/" & alarmId & ".pid"
    
    try
      set pidFile to POSIX path of pidFile
      set pid to do shell script "cat " & quoted form of pidFile
      do shell script "kill " & pid
      do shell script "rm -f " & quoted form of pidFile
    on error errMsg
      display dialog "Error stopping alarm: " & errMsg buttons {"OK"} default button "OK"
    end try
  end if
end run 