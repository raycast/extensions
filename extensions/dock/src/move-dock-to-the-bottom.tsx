import { closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async () => {
  await closeMainWindow();
  try {
    await runAppleScript(
      'tell application "System Events" to tell dock preferences \n set screen edge to bottom \n end tell',
    );
  } catch (error) {
    await showFailureToast(error, { title: "Could not move Dock" });
  }
};
