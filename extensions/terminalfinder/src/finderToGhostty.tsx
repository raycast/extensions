import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  let script = `
        if application "Finder" is not running then
            return "Not running"
        end if

        tell application "Finder"
            set pathList to (quoted form of POSIX path of (folder of the front window as alias))
        end tell
    `;

  script += `
        set command to "open -a /Applications/Ghostty.app " & pathList
        do shell script command
    `;

  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
