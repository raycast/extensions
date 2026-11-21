import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getAccounts } from "./scripts/accounts";
import { getMessages } from "./scripts/messages";

export default async function RefreshMail() {
  // Any `tell application "Mail"` launches Mail, so the background refresh would open it (and switch to its assigned desktop) when it is closed
  if (environment.launchType === LaunchType.Background) {
    const isMailRunning = await runAppleScript(`application id "com.apple.mail" is running`);
    if (isMailRunning !== "true") {
      console.log("Mail is not running, skipping background refresh");
      return;
    }
  }

  if (environment.launchType !== LaunchType.Background) {
    await showToast(Toast.Style.Animated, "Refreshing all Mail accounts");
  } else {
    console.log("Refreshing all Mail accounts...");
  }
  const accounts = await getAccounts();
  if (!accounts) {
    if (environment.launchType !== LaunchType.Background) {
      await showToast(Toast.Style.Failure, "Failed to get Mail accounts");
    } else {
      await showHUD("Failed to get Mail accounts");
    }
    return;
  }

  const mailboxes = accounts.flatMap((account) => account.mailboxes.map((mailbox) => ({ ...mailbox, account })));
  if (!mailboxes) {
    if (environment.launchType !== LaunchType.Background) {
      await showToast(Toast.Style.Failure, "Failed to get mailboxes");
    } else {
      await showHUD("Failed to get mailboxes");
    }
    return;
  }

  if (environment.launchType !== LaunchType.Background) {
    await showToast(Toast.Style.Animated, "Refreshing messages for accounts");
  }

  let failed = false;
  for (const mailbox of mailboxes) {
    const messages = await getMessages(mailbox.account, mailbox);
    if (!messages) {
      failed = true;
      console.log(`Failed to refresh messages for ${mailbox.account.name}: ${mailbox.name}`);
    }
  }
  if (failed) {
    if (environment.launchType !== LaunchType.Background) {
      await showToast(Toast.Style.Failure, "Failed to refresh some mailboxes");
    } else {
      console.log("Failed to refresh some mailboxes");
    }
  } else {
    if (environment.launchType !== LaunchType.Background) {
      await showToast(Toast.Style.Success, "Refreshed all Mail accounts");
    } else {
      console.log("Refreshed all Mail accounts");
    }
  }
}
