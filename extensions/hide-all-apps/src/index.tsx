import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {
  const { alsoHideRaycast } = getPreferenceValues();

  if (alsoHideRaycast) {
    await closeMainWindow();
  }

  await runAppleScript(`
activate application "Finder"
tell application "System Events"
    keystroke "h" using {command down, option down}
end tell
tell application "Finder" to set collapsed of windows to true
  `);
}
