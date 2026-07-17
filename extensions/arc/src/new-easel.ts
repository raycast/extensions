import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function runAppleScriptAction() {
  return runAppleScript(`
      tell application "Arc"
      if (count of windows) is 0 then
        make new window
      end if
      activate
    end tell
    delay (0.5)
    tell application "Arc"
      activate
    end tell

    tell application "System Events"
      tell process "Arc"
        click menu item "New Easel" of menu "File" of menu bar 1
      end tell
    end tell
  `);
}

export default async function command() {
  try {
    await runAppleScriptAction();
  } catch {
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed opening a new Easel",
    });
  }
}
