import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    await runAppleScript(
      'tell application "System Events" \n tell application "QuickTime Player" to activate frontmost \n tell application "QuickTime Player" to start (new audio recording) \n end tell'
    );
    await closeMainWindow();
    await showHUD("Started audio recording");
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
};
