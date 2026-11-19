import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

// Chrome's "Add Tab to New Split View" shortcut (Option + Command + N).
// Shortcuts are not translated like menu titles, so this works in any Chrome language.
export default async function Command() {
  try {
    await closeMainWindow();
    await runAppleScript(`
      tell application "Google Chrome" to activate
      delay 0.3
      tell application "System Events"
        tell process "Google Chrome"
          keystroke "n" using {command down, option down}
        end tell
      end tell
    `);
  } catch {
    await showHUD("❌ Failed to add tab to a new split view in Google Chrome");
  }
}
