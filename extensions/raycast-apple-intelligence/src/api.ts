import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import Preferences from "./Preferences";

export async function executeWritingToolCommand(number: number, title: string) {
  const preferences = getPreferenceValues<Preferences>();
  const { localizedEdit, localizedWritingTools } = preferences;

  await closeMainWindow();

  try {
    await runAppleScript(`
      tell application "System Events"
        try
          tell (first process whose frontmost is true)
            click menu bar item "${localizedEdit}" of menu bar 1
            click menu item "${localizedWritingTools}" of menu "${localizedEdit}" of menu bar item "${localizedEdit}" of menu bar 1
            click menu item ${number} of menu 1 of menu item "${localizedWritingTools}" of menu "${localizedEdit}" of menu bar item "${localizedEdit}" of menu bar 1
          end tell
        on error
          key code 53 -- Press "escape" key
          error "Failed to execute the command"
        end try
      end tell
      `);
  } catch (error) {
    console.error(error);

    await showToast({ title: "Failed to execute " + title, style: Toast.Style.Failure });
  }
}
