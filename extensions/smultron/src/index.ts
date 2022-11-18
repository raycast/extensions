import { closeMainWindow, showToast, getApplications, Toast, Clipboard, getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  try {
    // Get selected text
    const selectedText = await getSelectedText();

    // Check if Smultron is installed, if it is, open it and paste the selected text into it
    const installedApplications = await getApplications();
    const smultron = installedApplications.find((app) => app.name === "Smultron");

    if (smultron) {
      await closeMainWindow();
      await runAppleScript(`
        tell application "Smultron"
          if it is not running then launch
          set frontmost to true
          activate
        end tell

        tell application "System Events" to tell process "Smultron"
          click menu item "New" of menu 1 of menu bar item "File" of menu bar 1
        end tell
    `);
      await Clipboard.paste(selectedText);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Smultron App is not installed",
      });
      return;
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
    });
    return;
  }
}
