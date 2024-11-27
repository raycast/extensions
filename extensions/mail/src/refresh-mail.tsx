import { getMessages } from "./scripts/messages";
import { getAccounts } from "./scripts/accounts";
import { closeMainWindow, showToast, Toast } from "@raycast/api";

export default async function RefreshMail() {
  await closeMainWindow();

  await showToast(Toast.Style.Animated, "Fetching all accounts");
  const accounts = await getAccounts();
  if (!accounts) return;

  const mailboxes = accounts.flatMap((account) => account.mailboxes.map((mailbox) => ({ ...mailbox, account })));
  if (!mailboxes) return;

  await showToast(Toast.Style.Animated, "Refreshing messages for accounts");
  const getAccountMessagesPromises = mailboxes.map((mailbox) => getMessages(mailbox.account, mailbox));

  await Promise.all(getAccountMessagesPromises);
  await showToast(Toast.Style.Success, "Refreshed all accounts");
}
