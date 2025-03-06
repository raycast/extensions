import { Clipboard, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const directory = await Clipboard.readText();

  const script = `
      tell application "System Events"
      set pathList to "${directory}"
      if not (exists (processes where name is "Terminal")) then
          do shell script "open -a Terminal " & pathList
      else
          tell application "Terminal"
          activate
          if (count of windows) is 0 then
              do script ("cd " & pathList)
          else
              tell application "System Events" to tell process "Terminal.app" to keystroke "t" using command down
              delay 1
              do script ("cd " & pathList) in first window
          end if
          end tell
      end if
      end tell
  `;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
