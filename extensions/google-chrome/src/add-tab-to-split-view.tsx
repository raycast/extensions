import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const MENU_ITEM = "Add Tab to New Split View";

export default async function Command() {
  try {
    await closeMainWindow();
    await runAppleScript(`
      tell application "Google Chrome" to activate
      tell application "System Events"
        tell process "Google Chrome"
          click menu item "${MENU_ITEM}" of menu "Tab" of menu bar item "Tab" of menu bar 1
        end tell
      end tell
    `);
  } catch {
    await showHUD(`❌ Failed to run "${MENU_ITEM}" in Google Chrome`);
  }
}
