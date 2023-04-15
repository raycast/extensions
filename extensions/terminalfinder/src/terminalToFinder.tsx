import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

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
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
