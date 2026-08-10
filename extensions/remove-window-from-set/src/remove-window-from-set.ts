import { runAppleScript } from "@raycast/utils";
import { showHUD } from "@raycast/api";

export default async function Command() {
  try {
    await runAppleScript(`
tell application "System Events" to tell (process 1 where frontmost is true)
    click menu item "Remove Window from Set" of menu 1 of menu bar item "Window" of menu bar 1
end tell
    `);
    await showHUD("Successfully clicked `Remove Window from Set`");
  } catch (error) {
    await showHUD("Error when trying to click `Remove Window from Set`");
  }
}
