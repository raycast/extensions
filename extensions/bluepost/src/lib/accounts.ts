import { LocalStorage } from "@raycast/api";

export interface MastodonAccount {
  id: string;
  instance: string;
  handle?: string;
  token: string;
}

const ACCOUNTS_KEY = "mastodon-accounts";

export async function getMastodonAccounts(): Promise<MastodonAccount[]> {
  const raw = await LocalStorage.getItem<string>(ACCOUNTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as MastodonAccount[];
}

export async function addMastodonAccount(
  account: MastodonAccount,
): Promise<void> {
  const accounts = await getMastodonAccounts();
  accounts.push(account);
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function removeMastodonAccount(id: string): Promise<void> {
  const accounts = await getMastodonAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
}
