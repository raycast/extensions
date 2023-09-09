import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async () => {
  let script = `
        if application "Finder" is not running then
            return "Not running"
        end if

        tell application "Finder"
            set pathList to (quoted form of POSIX path of (folder of the front window as alias))
            set textToType to "clear; cd " & pathList
        end tell
    `;

  script += `
    tell application "System Events"
    if not (exists (processes where name is "kitty")) then
        set open_cmd to "open -a kitty" & "-o allow_remote_control=yes --listen-on unix:/tmp/mykitty"
        do shell script open_cmd
    else
        set activeApp to ""
        repeat while activeApp is not "kitty"
          tell application "System Events"
            set activeApp to name of first application process whose frontmost is true
          end tell
        end repeat
        tell application "kitty" to activate
        tell application "System Events" to keystroke textToType
        tell application "System Events"
            key code 36 -- enter key
        end tell
      end if
    end tell
    `;

  try {
    const result = await runAppleScript(script);
    console.dir(result);

    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
