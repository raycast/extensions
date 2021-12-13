import { runAppleScript } from "run-applescript";
import { showToast, ToastStyle } from "@raycast/api";

export default async () => {
  const script = `
    if application "Terminal" is not running then
        return "Not running"
    end if

    tell application "Terminal"
      do script "open -a Finder ./" in first window
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    await showToast(ToastStyle.Success, "Done", result);
  } catch (err) {
    await showToast(ToastStyle.Failure, "Terminal is not running");
  }
};
