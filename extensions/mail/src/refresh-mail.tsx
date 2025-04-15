import { getMessages } from "./scripts/messages";
import { getAccounts } from "./scripts/accounts";
import { showToast, Toast, environment, LaunchType, showHUD } from "@raycast/api";

export default async function RefreshMail() {
  if (environment.launchType !== LaunchType.Background) {
    await showToast(Toast.Style.Animated, "Refreshing All Mail Accounts");
  } else {
    console.log("Refreshing All Mail Accounts...");
  }
  const accounts = await getAccounts();
  if (!accounts) {
    if (environment.launchType !== LaunchType.Background) {
      await showToast(Toast.Style.Failure, "Failed to Get Mail Accounts");
    } else {
      await showHUD("Failed to Get Mail Accounts");
    }
    return;
  }

  const mailboxes = accounts.flatMap((account) => account.mailboxes.map((mailbox) => ({ ...mailbox, account })));
  if (!mailboxes) {
    if (environment.launchType !== LaunchType.Background) {
      await showToast(Toast.Style.Failure, "Failed to Get Mailboxes");
    } else {
      await showHUD("Failed to Get Mailboxes");
    }
    return;
  }

  if (environment.launchType !== LaunchType.Background) {
    await showToast(Toast.Style.Animated, "Refreshing Messages for Accounts");
  }
  const getAccountMessagesPromises = mailboxes.map((mailbox) => getMessages(mailbox.account, mailbox));

  const mailboxMessages = await Promise.all(getAccountMessagesPromises);
  for (const messages of mailboxMessages) {
    if (!messages) {
      if (environment.launchType !== LaunchType.Background) {
        await showToast(Toast.Style.Failure, "Failed to Refresh Messages");
      } else {
        await showHUD("Failed to Refresh Messages");
      }
      return;
    }
  }
  if (environment.launchType !== LaunchType.Background) {
    await showToast(Toast.Style.Success, "Refreshed All Mail Accounts");
  } else {
    console.log("Refreshed All Mail Accounts");
  }
}
