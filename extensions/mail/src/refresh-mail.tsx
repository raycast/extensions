import { getMessages } from "./scripts/messages";
import { getAccounts } from "./scripts/accounts";

export default async function RefreshMail() {
  const accounts = await getAccounts();
  if (!accounts) return;

  const mailboxes = accounts.flatMap((account) => account.mailboxes.map((mailbox) => ({ ...mailbox, account })));
  if (!mailboxes) return;

  const getAccountMessagesPromises = mailboxes.map((mailbox) => getMessages(mailbox.account, mailbox));

  await Promise.all(getAccountMessagesPromises);
}
