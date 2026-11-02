import { getAccounts } from "../scripts/accounts";

type Input = {
  accountName?: string;
};

export default async function (input: Input) {
  const accounts = await getAccounts();
  if (!accounts) {
    throw new Error("Unable to read Apple Mail accounts");
  }

  const normalizedAccountName = input.accountName?.trim().toLowerCase();
  const matchedAccounts = normalizedAccountName
    ? accounts.filter((account) => account.name.trim().toLowerCase() === normalizedAccountName)
    : accounts;
  if (matchedAccounts.length === 0) {
    throw new Error(`Apple Mail account "${input.accountName}" was not found`);
  }

  return matchedAccounts.map((account) => ({
    accountName: account.name,
    mailboxes: account.mailboxes.map((mailbox) => ({
      name: mailbox.name,
      type: mailbox.type,
      unreadCount: mailbox.unreadCount,
    })),
  }));
}
