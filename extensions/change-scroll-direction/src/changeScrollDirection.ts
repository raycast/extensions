import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  try {
    await runAppleScriptSilently(script);
    await showHUD("Scroll direction changed");
  } catch {
    await showHUD("Couldn't change scroll direction...");
  }
}

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is before running the AppleScript to keep the UI snappy.
 *
 * @param appleScript - The AppleScript to run
 * @throws An error when the AppleScript fails to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

const script = `
tell application "System Preferences"
	reveal anchor "trackpadTab" of pane id "com.apple.preference.trackpad"
end tell

tell application "System Events" to tell process "System Preferences"
	click checkbox 1 of tab group 1 of window 0
end tell

quit application "System Preferences"

return 1`;
