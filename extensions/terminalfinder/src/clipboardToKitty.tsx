import { Clipboard, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async () => {
  const directory = await Clipboard.readText();
  console.log("clipboard: ", directory);

  const script = `
      set pathList to "${directory}"
      set command to "clear; cd " & pathList
    tell application "System Events"
      if not (exists (processes where name is "kitty")) then
          set open_cmd to "/Applications/Kitty.app/Contents/MacOS/kitty -o allow_remote_control=yes --listen-on unix:/tmp/mykitty"
          do shell script open_cmd
      else
          set activeApp to ""
          repeat while activeApp is not "kitty"
            tell application "System Events"
              set activeApp to name of first application process whose frontmost is true
            end tell
          end repeat
          tell application "kitty" to activate

          do shell script "/Applications/kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty new-window --new-tab --cwd " & quoted form of pathList
          do shell script "/Applications/Kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty send-text " & quoted form of command
          tell application "System Events"
              key code 36 -- enter key
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
