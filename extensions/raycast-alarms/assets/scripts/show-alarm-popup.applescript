-- Alarm notification popup script

on run argv
  set alarmTitle to "Raycast Alarm"
  
  -- Check if we have at least one argument (the alarm title)
  if (count of argv) > 0 then
    set alarmTitle to item 1 of argv
  end if
  
  -- Create a dialog with bell emoji in the title
  set dialogResult to display dialog alarmTitle buttons {"Stop"} default button "Stop" with title "⏰ Alarm"
  
  -- Return the result of the dialog
  if button returned of dialogResult is "Stop" then
    return "stop"
  end if
end run 