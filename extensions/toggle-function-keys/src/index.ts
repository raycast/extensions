import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  await runAppleScript(`do shell script "open x-apple.systempreferences:com.apple.preference.keyboard?FunctionKeys"`);
  await runAppleScript(`
  tell application "System Events"
    tell application process "System Settings"
      delay 1
      set timeoutSeconds to 2.0
      set endDate to (current date) + timeoutSeconds
      set checkboxClicked to false
      repeat
        try
          tell application "System Events"
            click checkbox 1 of group 1 of scroll area 1 of group 2 of splitter group 1 of group 1 of sheet 1 of window "Keyboard" of application process "System Settings"
          end tell
          set checkboxClicked to true
          exit repeat
        on error errorMessage
          if (current date) > endDate then
            error "Can not click checkbox"
          end if
        end try
      end repeat
      set uiElementClicked to false
      repeat
        try
          tell application "System Events"
            click UI Element 2 of group 2 of splitter group 1 of group 1 of sheet 1 of window "Keyboard" of application process "System Settings"
          end tell
          set uiElementClicked to true
          exit repeat
        on error errorMessage
          if (current date) > endDate then
            error "Can not click UI Element"
          end if
        end try
      end repeat
      if checkboxClicked and uiElementClicked then
        delay 0.5
        tell application "System Settings"
          quit
        end tell
      end if
    end tell
  end tell
  `);
  await showHUD("Successfully toggled function keys");
}
