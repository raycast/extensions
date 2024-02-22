import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {
  const { alsoHideRaycast } = getPreferenceValues();

  if (alsoHideRaycast) {
    await closeMainWindow();
  }

  await runAppleScript(`
activate application "Finder"
tell application "System Events" to tell process "Finder"
    click menu item "Hide Others" of menu 1 of menu bar item "Finder" of menu bar 1
end tell
tell application "Finder" to set collapsed of windows to true
  `);
}
