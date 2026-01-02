import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function () {
  const result = await runAppleScript(`
set newState to 0

-- Open Mouse settings
open location "x-apple.systempreferences:com.apple.Mouse-Settings.extension"
delay 1

tell application "System Events" to tell process "System Settings"
  -- Wait for Mouse window to open
  repeat until window 1 exists
    delay 0.2
  end repeat

  delay 0.5

  -- Click "Advanced..." button (button 1 in the scroll area)
  click button 1 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1

  -- Wait for the sheet to appear
  repeat until sheet 1 of window 1 exists
    delay 0.2
  end repeat

  delay 0.3

  -- Toggle the Pointer acceleration checkbox
  set theCheckbox to checkbox 1 of group 1 of scroll area 1 of group 1 of sheet 1 of window 1
  click theCheckbox

  -- Get the new state (1 = on, 0 = off)
  set newState to value of theCheckbox

  delay 0.5

  -- Click Done button
  click button 1 of group 1 of sheet 1 of window 1

  -- Wait for sheet to close
  repeat while sheet 1 of window 1 exists
    delay 0.2
  end repeat
end tell

tell application "System Settings" to quit

return newState
`);

  const isEnabled = result === "1";
  await showHUD(`Pointer Acceleration: ${isEnabled ? "ON" : "OFF"}`);
}
