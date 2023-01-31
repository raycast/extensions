import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  let script: string;

  script = `
      tell application "Warp" to activate
      tell application "System Events"
        keystroke "open -a Finder ./"
        key code 36
      end tell
  `;

  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
