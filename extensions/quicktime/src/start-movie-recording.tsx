import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runQuickTimeScript } from "./quicktime";

export default async () => {
  try {
    await runQuickTimeScript('tell application "QuickTime Player" to start (new movie recording)');
    await closeMainWindow();
    await showHUD("Started movie recording");
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
};
