import { showHUD, LaunchType, LocalStorage, environment } from "@raycast/api";
import { getAllRecipients } from "./background/recipients";
import { runAppleScript } from "run-applescript";

export default async function CheckForMail() {
  if (environment.launchType == LaunchType.Background) {
    const recipients = await getAllRecipients();
    await LocalStorage.setItem("all-recipients", JSON.stringify(recipients));
  } else {
    await showHUD("Checking For New Mail");
    await runAppleScript(`
      tell application "Mail"
        repeat with acc in accounts
          tell acc to check for new mail
        end repeat
      end tell
    `);
  }
}
