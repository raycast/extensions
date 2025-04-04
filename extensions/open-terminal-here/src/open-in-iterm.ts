import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    // Get Finder's current folder path
    const cwd = await runAppleScript(`
      tell application "Finder"
        if (count of windows) is 0 then
          error "No Finder window open."
        end if
        set cwd to POSIX path of (insertion location as alias)
      end tell
      return cwd
    `);

    if (!cwd) throw new Error("Could not retrieve Finder path");

    // Open iTerm in the retrieved path without opening duplicate windows
    await runAppleScript(`
      tell application "iTerm"
        activate
        if (count of windows) is greater than 0 then
          -- iTerm has at least one window, create a new tab and cd there
          tell current window to create tab with default profile
          delay 0.5
          tell current session of current window to write text "cd " & quoted form of "${cwd}"
        else
          -- iTerm is not open or has no windows, open a new window
          create window with default profile
          delay 0.5
          tell current session of current window to write text "cd " & quoted form of "${cwd}"
        end if
      end tell
    `);

    await showToast(Toast.Style.Success, "Opened iTerm", `Path: ${cwd}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error", error instanceof Error ? error.message : "Unknown error");
  }
}
