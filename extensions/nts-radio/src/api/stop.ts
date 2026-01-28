import { runAppleScript } from "run-applescript";
import { showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../utils/getError";

export async function stop() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "⏹️  Stopping audio stream",
    });
    await runAppleScript(`
      tell application "QuickTime Player"
        stop every document
      end tell`);
  } catch (err) {
    const error = getErrorMessage(err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Sorry! Could not stop audio stream",
    });
    console.log("Error when stopping audio stream:", error);
  }
}
