import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const toggle = `tell application "System Events" to tell dock preferences
  set autohide menu bar to not autohide menu bar
  return autohide menu bar
end tell`;

// Only toggles the menu bar. Windows are left where they are.
export default async () => {
  await closeMainWindow();
  try {
    const hidden = (await runAppleScript(toggle)) === "true";
    await showHUD(hidden ? "Menu bar hidden" : "Menu bar shown");
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle the menu bar" });
  }
};
