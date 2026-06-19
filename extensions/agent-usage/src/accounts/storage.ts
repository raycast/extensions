// src/accounts/storage.ts
import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import type { AccountEntry, AccountsProvider } from "./types";
import { ACCOUNTS_STORAGE_KEYS } from "./types";

function storageKey(provider: AccountsProvider): string {
  return ACCOUNTS_STORAGE_KEYS[provider];
}

export async function loadAccounts(provider: AccountsProvider): Promise<AccountEntry[]> {
  const raw = await LocalStorage.getItem<string>(storageKey(provider));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape validation — drop malformed entries
    return parsed.filter(
      (e): e is AccountEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof e.id === "string" &&
        typeof e.label === "string" &&
        typeof e.token === "string" &&
        e.token.trim().length > 0,
    );
  } catch (err) {
    console.error("Failed to parse accounts:", err);
    return [];
  }
}

export async function saveAccounts(provider: AccountsProvider, accounts: AccountEntry[]): Promise<void> {
  await LocalStorage.setItem(storageKey(provider), JSON.stringify(accounts));
}

export async function addAccount(provider: AccountsProvider, label: string, token: string): Promise<AccountEntry> {
  const accounts = await loadAccounts(provider);
  const entry: AccountEntry = { id: randomUUID(), label: label.trim(), token: token.trim() };
  await saveAccounts(provider, [...accounts, entry]);
  return entry;
}

export async function updateAccount(
  provider: AccountsProvider,
  id: string,
  patch: Partial<Pick<AccountEntry, "label" | "token">>,
): Promise<boolean> {
  const accounts = await loadAccounts(provider);
  const found = accounts.some((a) => a.id === id);
  if (!found) return false;
  const updated = accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
  await saveAccounts(provider, updated);
  return true;
}

export async function deleteAccount(provider: AccountsProvider, id: string): Promise<boolean> {
  const accounts = await loadAccounts(provider);
  const found = accounts.some((a) => a.id === id);
  if (!found) return false;
  await saveAccounts(
    provider,
    accounts.filter((a) => a.id !== id),
  );
  return true;
}
