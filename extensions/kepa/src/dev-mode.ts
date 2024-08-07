import { showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function main() {
  try {
    const res = await runAppleScript(
      `
      tell application "Shortcuts Events"
        run shortcut "Dev"
      end tell
      `,
    );
    await showHUD(res);
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
