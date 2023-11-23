import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function CheckForMail() {
  await showHUD("Checking For New Mail");
  await runAppleScript(`
    tell application "Mail"
      repeat with acc in accounts
        tell acc to check for new mail
      end repeat
    end tell
  `);
}
