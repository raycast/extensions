import { Toast, showToast, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const preferences = getPreferenceValues();
  const selectedTerminal = preferences.preferedTerminalApp;
  let script: string;

  switch (selectedTerminal) {
    case "iTerm":
      script = `
                if application "iTerm" is not running then
                    return "Not running"
                end if
            
                tell application "iTerm"
                tell the current session of current window
                    write text "open -a Finder ./"
                end tell
                end tell
            `;
      break;
    case "warp":
      await showToast(Toast.Style.Failure, "That's currently not supported with Warp");
      return;
    default:
      script = `
                if application "Terminal" is not running then
                    return "Not running"
                end if
            
                tell application "Terminal"
                do script "open -a Finder ./" in first window
                end tell
            `;
      break;
  }

  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
