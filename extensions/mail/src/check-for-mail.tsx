import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function CheckForMail() {
  await closeMainWindow();

  await showToast(Toast.Style.Animated, "Checking for new mail");
  await runAppleScript(`
    tell application "Mail"
      repeat with acc in accounts
        tell acc to check for new mail
      end repeat
    end tell
  `);

  await showToast(Toast.Style.Success, "Loaded new messages");
}
