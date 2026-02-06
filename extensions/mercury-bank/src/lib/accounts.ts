import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "./constants";
import { MercuryApi } from "./api";
import { probeFeatures } from "./features";
import type { FeatureCapabilities, StoredAccount } from "./types";

export async function getStoredAccounts(): Promise<StoredAccount[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.ACCOUNTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
}

export async function saveStoredAccounts(
  accounts: StoredAccount[],
): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export async function addStoredAccount(
  name: string,
  apiKey: string,
): Promise<StoredAccount> {
  const accounts = await getStoredAccounts();
  const account: StoredAccount = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    apiKey,
    createdAt: new Date().toISOString(),
  };
  try {
    const capabilities = await probeFeatures(apiKey);
    account.capabilities = capabilities;
  } catch {
    // probing failure is non-fatal
  }
  accounts.push(account);
  await saveStoredAccounts(accounts);

  // If this is the first account, set it as active
  if (accounts.length === 1) {
    await setActiveAccountId(account.id);
  }

  return account;
}

export async function updateStoredAccount(
  id: string,
  updates: Partial<Pick<StoredAccount, "name" | "apiKey" | "capabilities">>,
): Promise<void> {
  const accounts = await getStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Account not found");
  accounts[idx] = { ...accounts[idx], ...updates };
  await saveStoredAccounts(accounts);
}

export async function updateAccountCapabilities(
  id: string,
  capabilities: FeatureCapabilities,
): Promise<void> {
  const accounts = await getStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Account not found");
  accounts[idx] = { ...accounts[idx], capabilities };
  await saveStoredAccounts(accounts);
}

export async function removeStoredAccount(id: string): Promise<void> {
  const accounts = await getStoredAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  await saveStoredAccounts(filtered);

  const activeId = await getActiveAccountId();
  if (activeId === id) {
    await setActiveAccountId(filtered.length > 0 ? filtered[0].id : null);
  }
}

export async function getActiveAccountId(): Promise<string | null> {
  const id = await LocalStorage.getItem<string>(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  return id ?? null;
}

export async function setActiveAccountId(id: string | null): Promise<void> {
  if (id) {
    await LocalStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, id);
  } else {
    await LocalStorage.removeItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  }
}

export async function getActiveAccount(): Promise<StoredAccount | null> {
  const activeId = await getActiveAccountId();
  if (!activeId) return null;
  const accounts = await getStoredAccounts();
  return accounts.find((a) => a.id === activeId) ?? accounts[0] ?? null;
}

export async function getApiClient(): Promise<MercuryApi | null> {
  const account = await getActiveAccount();
  if (!account) return null;
  return new MercuryApi(account.apiKey);
}