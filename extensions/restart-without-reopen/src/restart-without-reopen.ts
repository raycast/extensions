import { confirmAlert, Alert, getPreferenceValues } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { tryit } from "radash";

export default async function main() {
  const { showConfirmation } = getPreferenceValues<Preferences>();

  if (showConfirmation) {
    const confirmed = await confirmAlert({
      title: "Are you sure you want to restart now?",
      message: "Windows will not reopen after restart.",
      primaryAction: {
        title: "Restart",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }
  }

  const script = /* applescript */ `
        tell application "System Events"
          -- 1. Get the frontmost process and click the Apple menu
          set frontProc to first process whose frontmost is true
          click menu bar item 1 of menu bar 1 of frontProc
          
          -- 2. Wait for the menu to appear
          delay 0.3
          
          -- 3. Click the "Restart" menu item
          -- Using fuzzy matching to handle both English and Chinese text
          click (first menu item of menu 1 of menu bar item 1 of menu bar 1 of frontProc ¬
            whose name starts with "Restart" or name starts with "重新启动")
          
          -- 4. Wait for the dialog to appear
          -- Note: The restart dialog usually belongs to the "loginwindow" process
          repeat until exists (window 1 of process "loginwindow")
            delay 0.1
          end repeat
          
          -- 5. Check and uncheck the "Reopen windows" checkbox if needed
          tell process "loginwindow"
            tell window 1
              -- In macOS, this checkbox is usually the first checkbox
              set theCheckbox to checkbox 1
              if (value of theCheckbox as integer) is 1 then
                -- If checked, uncheck it by pressing space
                -- First set focus, then press space
                set focused of theCheckbox to true
                keystroke space
                delay 0.2
              end if
            end tell
          end tell
          
          -- 6. Finally, press enter to execute Restart
          keystroke return
        end tell
  `;

  const [err] = await tryit(() => runAppleScript(script))();
  if (err) {
    showFailureToast(err.message);
  }
}
