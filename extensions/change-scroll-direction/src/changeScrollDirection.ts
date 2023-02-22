import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  try {
    await runAppleScriptSilently(script);
    await showHUD("Scroll direction changed");
  } catch (err) {
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
  tell application "System Settings"
  activate
  end tell
  delay 0.1

  tell application "System Events"
  tell process "System Settings"
      click menu item "Trackpad" of menu "View" of menu bar 1
      delay 0.25
      click radio button 2 of tab group 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
      click checkbox "Natural scrolling" of group 1 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
      tell application "System Settings" to quit
  end tell
  end tell
return 1
`;
