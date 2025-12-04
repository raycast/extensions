import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    await runAppleScript('try \n tell application "QuickTime Player" to start (new movie recording) \n end try');
    await closeMainWindow();
    await showHUD("Started movie recording");
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
};
