import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const script = `
      if application "Ghostty" is not running then
      return "Not running"
      end if

      tell application "Finder" to activate
      tell application "Ghostty" to activate
      tell application "System Events"
        keystroke "open -a Finder ./"
        key code 76
      end tell
  `;

  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
