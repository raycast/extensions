-- Keyboard-only E2E repro for the "Compare AI Models" command.
--
-- Preconditions:
-- - Raycast is installed
-- - UI scripting enabled (System Settings -> Privacy & Security -> Accessibility)
--   for the terminal app running this script.
--
-- Behavior:
-- - Opens the command via deeplink
-- - Waits for list to populate
-- - Adds first model (cmd+shift+a)
-- - Moves selection down
-- - Adds second model (cmd+shift+a)

set deeplink to "raycast://extensions/carlesandres/models-dev/compare-models"
do shell script "open " & quoted form of deeplink

delay 1.0

tell application "System Events"
  repeat 50 times
    if (exists process "Raycast") then exit repeat
    delay 0.1
  end repeat

  tell process "Raycast"
    set frontmost to true
  end tell

  -- First run may require fetching models; wait long enough to be deterministic.
  delay 8.0

  -- Add first model
  keystroke "a" using {command down, shift down}
  delay 0.8

  -- Move to second model
  key code 125 -- down arrow
  delay 0.2

  -- Add second model (this is the historical crash point)
  keystroke "a" using {command down, shift down}
  delay 5.0
end tell
