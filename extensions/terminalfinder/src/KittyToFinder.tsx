import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const script = `
      if application "kitty" is not running then
          return "Not running"
      end if

      set command to "open -a Finder ./"
      set CR to " \\x0d"

      tell application "kitty" to activate
      do shell script "/Applications/Kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty send-text " & command & quoted form of CR
  `;

  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
