import { Clipboard, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const directory = await Clipboard.readText();

  const script = `
      tell application "System Events"
      -- some versions might identify as "iTerm2" instead of "iTerm"
      set isRunning to (exists (processes where name is "iTerm")) or (exists (processes where name is "iTerm2"))
      end tell

      tell application "iTerm"
      activate
      set hasNoWindows to ((count of windows) is 0)
      if isRunning and hasNoWindows then
          create window with default profile
      end if
      select first window

      tell the first window
          if isRunning and hasNoWindows is false then
          create tab with default profile
          end if
          set pathList to "${directory}"
          set command to "clear; cd " & pathList
          tell current session to write text command
          end tell
      end tell
  `;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
