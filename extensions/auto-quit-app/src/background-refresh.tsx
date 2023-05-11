import { closeMainWindow } from "@raycast/api";
import * as messageScripts from "./scripts/messages";
import { getMailAccounts } from "./scripts/account";

export default async function BackgroundRefresh() {
  closeMainWindow();

  const accounts = await getMailAccounts();
  if (!accounts) return;

  const mailboxes = accounts.flatMap((account) => account.mailboxes.map((mailbox) => ({ ...mailbox, account })));
  if (!mailboxes) return;

  const getAccountMessagesPromises = mailboxes.map((mailbox) =>
    messageScripts.getAccountMessages(mailbox.account, mailbox)
  );

  await Promise.all(getAccountMessagesPromises);
}
