import { closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async () => {
  await closeMainWindow();
  try {
    await runAppleScript('tell application "Screenshot" to activate');
  } catch (error) {
    await showFailureToast(error, { title: "Could not launch Screenshot app" });
  }
};
