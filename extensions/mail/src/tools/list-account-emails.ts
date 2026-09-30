import { getAccounts } from "../scripts/accounts";

type Input = {
  /**
   * Optional filter query to search for specific email addresses.
   */
  query?: string;
};

export default async function (input: Input) {
  // Load the user's mail accounts if this is the first time they're
  // using the extension.
  const accounts = await getAccounts();

  if (!accounts || accounts.length === 0) {
    return [];
  }

  // Collect all email addresses from all accounts
  const allEmails = accounts.flatMap((account) =>
    account.emails.map((email) => ({
      email,
      accountName: account.name,
      accountId: account.id,
    })),
  );

  // Filter by query if provided
  if (input.query) {
    const query = input.query.toLowerCase();
    return allEmails.filter(
      (item) => item.email.toLowerCase().includes(query) || item.accountName.toLowerCase().includes(query),
    );
  }

  return allEmails;
}
