import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const script = `
      if application "iTerm" is not running then
          return "Not running"
      end if
  
      tell application "iTerm"
      tell the current session of current window
          write text "open -a Finder ./"
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
