import { LocalStorage } from "@raycast/api";
import { PostHogAccount, removeAccountFromList, upsertAccount } from "./account-model";

const ACCOUNTS_KEY = "posthog-oauth-accounts";

export async function getAccounts(): Promise<PostHogAccount[]> {
  const storedAccounts = await LocalStorage.getItem<string>(ACCOUNTS_KEY);

  if (!storedAccounts) {
    return [];
  }

  try {
    const accounts = JSON.parse(storedAccounts);
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

export async function saveAccounts(accounts: PostHogAccount[]): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function saveAccount(account: PostHogAccount): Promise<void> {
  const accounts = await getAccounts();
  await saveAccounts(upsertAccount(accounts, account));
}

export async function removeAccount(accountId: string): Promise<PostHogAccount | null> {
  const accounts = await getAccounts();
  const account = accounts.find((existingAccount) => existingAccount.id === accountId) ?? null;
  const remainingAccounts = removeAccountFromList(accounts, accountId);

  await saveAccounts(remainingAccounts);

  return account;
}
