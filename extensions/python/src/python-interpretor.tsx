import { showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const script = `
    tell application "Terminal"
      do script "python3"
    end tell
    `;
    await runAppleScript(script);
    await showHUD("Python interpretor opened in terminal");
  } catch (error) {
    showFailureToast("Failed to open python interpretor in terminal");
  }
}
