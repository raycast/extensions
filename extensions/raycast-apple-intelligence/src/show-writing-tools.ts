import { showToast, closeMainWindow, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  await closeMainWindow();
  try {
    await runAppleScript(`
    tell application "System Events"
      try
        tell (first process whose frontmost is true)
          click menu bar item "Edit" of menu bar 1
          click menu item "Writing Tools" of menu "Edit" of menu bar item "Edit" of menu bar 1
          click menu item "Show Writing Tools" of menu 1 of menu item "Writing Tools" of menu "Edit" of menu bar item "Edit" of menu bar 1
        end tell
      on error
        key code 53 -- Press "escape" key
        error "Failed to execute the command"
      end try
    end tell
    `);
  } catch (error) {
    await showToast({ title: "Failed to show Writing Tools", style: Toast.Style.Failure });
  }
}
