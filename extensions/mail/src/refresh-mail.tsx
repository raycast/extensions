import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { getAccounts } from "./scripts/accounts";
import { getMessages } from "./scripts/messages";

export default async function RefreshMail() {
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
  const getAccountMessagesPromises = mailboxes.map((mailbox) => getMessages(mailbox.account, mailbox));

  const mailboxMessages = await Promise.all(getAccountMessagesPromises);
  for (const messages of mailboxMessages) {
    if (!messages) {
      if (environment.launchType !== LaunchType.Background) {
        await showToast(Toast.Style.Failure, "Failed to refresh messages");
      } else {
        console.log("Failed to refresh messages");
      }
      return;
    }
  }
  if (environment.launchType !== LaunchType.Background) {
    await showToast(Toast.Style.Success, "Refreshed all Mail accounts");
  } else {
    console.log("Refreshed all Mail accounts");
  }
}
