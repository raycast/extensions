import { runAppleScript } from "run-applescript";
import { showToast, Toast } from "@raycast/api";

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
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Terminal is not running");
  }
};
