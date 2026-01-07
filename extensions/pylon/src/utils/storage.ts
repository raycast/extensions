import { LocalStorage } from "@raycast/api";

const RECENT_ACCOUNTS_KEY = "recentAccounts";
const LAST_USED_KEY = "lastUsed";
const MAX_RECENT_ACCOUNTS = 10;

interface LastUsed {
  accountId?: string;
  projectId?: string;
  assigneeId?: string;
}

export async function getRecentAccounts(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_ACCOUNTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse recent accounts from storage:", error);
    return [];
  }
}

export async function addRecentAccount(accountId: string): Promise<void> {
  const recent = await getRecentAccounts();
  // Remove if already exists, then add to front
  const filtered = recent.filter((id) => id !== accountId);
  const updated = [accountId, ...filtered].slice(0, MAX_RECENT_ACCOUNTS);
  await LocalStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(updated));
}

export async function getLastUsed(): Promise<LastUsed> {
  const stored = await LocalStorage.getItem<string>(LAST_USED_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse last used values from storage:", error);
    return {};
  }
}

export async function setLastUsed(values: Partial<LastUsed>): Promise<void> {
  const current = await getLastUsed();
  const updated = { ...current, ...values };
  await LocalStorage.setItem(LAST_USED_KEY, JSON.stringify(updated));
}
