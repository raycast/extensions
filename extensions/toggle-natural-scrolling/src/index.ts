import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript(`
    tell application "System Settings"
        activate
    end tell
    delay 0.3
      
    tell application "System Events"
      tell process "System Settings"
        click menu item "Mouse" of menu "View" of menu bar 1
        delay 0.5
        click checkbox "Natural scrolling" of group 1 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
        tell application "System Settings" to quit
      end tell
    end tell`);
};
