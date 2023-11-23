import { runAppleScript } from "run-applescript";
import { getErrorMessage } from "../utils/getError";
import { Toast, showToast } from "@raycast/api";

export async function play(streamUrl: string) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "▶️  Opening audio stream",
    });
    await runAppleScript(`try
        tell application "QuickTime Player"
          tell document 1 to if exists then
            close
          end if
          open location "${streamUrl}"
          repeat while visible of window 1 = false
            delay 0.5
          end repeat
          delay 1
          set visible of window 1 to false
          return name of document 1
        end tell
      on error
        return "err:noapp"
      end try`);
  } catch (err) {
    const error = getErrorMessage(err);

    console.log("Error playing selected audio stream: ", error);
    throw new Error(error);
  }
}
