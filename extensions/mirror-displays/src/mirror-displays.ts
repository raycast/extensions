import { runAppleScript } from "@raycast/utils";
import { showHUD } from "@raycast/api";

function triggerKeyboardCombo() {
  return runAppleScript(
    `
    tell application "System Events"
      key code 145 using {command down}
    end tell
  `,
    {
      timeout: 500,
    },
  );
}

export default async function () {
  try {
    await triggerKeyboardCombo();
    showHUD("Toggling display mirroring");
  } catch (error) {
    showHUD("Failed to toggle display mirroring");
  }
}
