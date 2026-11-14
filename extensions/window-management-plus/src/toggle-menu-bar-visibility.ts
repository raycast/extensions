import { closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const toggle = `tell application "System Events" to tell dock preferences
  set autohide menu bar to not autohide menu bar
end tell`;

// Only toggles the menu bar. Windows are left where they are. It says nothing when it works: the
// menu bar appearing or going is the feedback.
export default async () => {
  await closeMainWindow();
  try {
    await runAppleScript(toggle);
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle the menu bar" });
  }
};
