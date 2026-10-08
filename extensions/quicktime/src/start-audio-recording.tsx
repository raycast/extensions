import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runQuickTimeScript } from "./quicktime";

export default async () => {
  try {
    await runQuickTimeScript('tell application "QuickTime Player"\n activate\n start (new audio recording)\nend tell');
    await closeMainWindow();
    await showHUD("Started audio recording");
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
};
