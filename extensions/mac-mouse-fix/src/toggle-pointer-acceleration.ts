import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function togglePointerAcceleration() {
  try {
    await closeMainWindow();

    const result = await runAppleScript(`
set newState to 0

-- Open Mouse settings
open location "x-apple.systempreferences:com.apple.Mouse-Settings.extension"
delay 1

tell application "System Settings"
  activate
end tell

delay 0.5

tell application "System Events" to tell process "System Settings"
  -- Ensure frontmost
  set frontmost to true

  -- Wait for Mouse window to open
  repeat 30 times
    if window 1 exists then exit repeat
    delay 0.2
  end repeat

  delay 0.5

  -- Click "Advanced..." button with retry
  repeat 3 times
    try
      click button 1 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1
      exit repeat
    on error
      delay 0.3
    end try
  end repeat

  -- Wait for sheet to appear
  repeat 30 times
    if sheet 1 of window 1 exists then exit repeat
    delay 0.2
  end repeat

  delay 0.5

  -- Click checkbox with retry
  repeat 3 times
    try
      click checkbox 1 of group 1 of scroll area 1 of group 1 of sheet 1 of window 1
      exit repeat
    on error
      delay 0.3
    end try
  end repeat

  -- Wait for state to update
  delay 0.3

  -- Read ACTUAL state with fresh reference
  set newState to value of checkbox 1 of group 1 of scroll area 1 of group 1 of sheet 1 of window 1

  -- Click Done button with retry
  repeat 3 times
    try
      click button 1 of group 1 of sheet 1 of window 1
      exit repeat
    on error
      delay 0.3
    end try
  end repeat

  -- Wait for sheet to close
  repeat 30 times
    if not (sheet 1 of window 1 exists) then exit repeat
    delay 0.2
  end repeat
end tell

delay 0.5

-- Quit with retry
repeat 3 times
  try
    tell application "System Settings" to quit
    exit repeat
  on error
    delay 0.3
  end try
end repeat

return newState
`);

    // Mouse → Advanced "Pointer acceleration" checkbox uses inverted semantics: value "1" = acceleration
    // OFF, "0" = acceleration ON (opposite of typical AX checkbox 1=on). Verified by testing; using
    // result === "1" for isEnabled showed the wrong state in the HUD. See: Apple Support "Mouse settings".
    const isEnabled = result !== "1";
    await showHUD(`Pointer Acceleration: ${isEnabled ? "ON" : "OFF"}`);
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
