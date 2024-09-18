import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  let script = `
        if application "Finder" is not running then
            return "Finder is not running"
        end if

        tell application "Finder"
            try
                set currentFolderPath to POSIX path of (folder of the front window as alias)
            on error
                return "No Finder window open"
            end try
        end tell
    `;

  script += `
        set command to "open -n -b 'com.github.wez.wezterm' --args start --cwd " & quoted form of currentFolderPath
        do shell script command
    `;

  try {
    const result = await runAppleScript(script);

    if (result === "Finder is not running" || result === "No Finder window open") {
      await showToast(Toast.Style.Failure, result);
    } else {
      await showToast(Toast.Style.Success, "Done", result);
    }
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
