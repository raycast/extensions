import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export async function executeWritingToolCommand(command: string | number) {
  await closeMainWindow();
  try {
    await runAppleScript(`
      tell application "System Events"
        try
          tell (first process whose frontmost is true)
            click menu bar item "Edit" of menu bar 1
            click menu item "Writing Tools" of menu "Edit" of menu bar item "Edit" of menu bar 1
            click menu item ${typeof command == "number" ? `${command}` : `"${command}"`} of menu 1 of menu item "Writing Tools" of menu "Edit" of menu bar item "Edit" of menu bar 1
          end tell
        on error
          key code 53 -- Press "escape" key
          error "Failed to execute the command"
        end try
      end tell
      `);
  } catch (error) {
    console.error(error);
    await showToast({ title: "Failed to execute " + command, style: Toast.Style.Failure });
  }
}
