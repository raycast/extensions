import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { normalizeServerUrl } from "../api/client";
import { DokployAccount, DokployAccountInput } from "./types";

/**
 * Accounts live in LocalStorage rather than in Raycast preferences: preferences hold a single
 * fixed set of fields, and we need an arbitrary number of instances the user can add and remove.
 * LocalStorage is scoped to this extension and encrypted at rest by Raycast.
 */
const ACCOUNTS_KEY = "dokploy.accounts";
const ACTIVE_ACCOUNT_KEY = "dokploy.activeAccountId";

export async function listAccounts(): Promise<DokployAccount[]> {
  const raw = await LocalStorage.getItem<string>(ACCOUNTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DokployAccount[]) : [];
  } catch {
    // Corrupted payload: better to start clean than to wedge every command.
    return [];
  }
}

async function writeAccounts(accounts: DokployAccount[]): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function createAccount(input: DokployAccountInput): Promise<DokployAccount> {
  const accounts = await listAccounts();
  const account: DokployAccount = {
    id: randomUUID(),
    label: input.label.trim(),
    url: normalizeServerUrl(input.url),
    apiKey: input.apiKey.trim(),
    createdAt: new Date().toISOString(),
  };

  await writeAccounts([...accounts, account]);

  // The first account added becomes the active one, so the other commands work right away.
  if (accounts.length === 0) {
    await setActiveAccountId(account.id);
  }

  return account;
}

export async function updateAccount(id: string, input: DokployAccountInput): Promise<void> {
  const accounts = await listAccounts();
  const next = accounts.map((account) =>
    account.id === id
      ? {
          ...account,
          label: input.label.trim(),
          url: normalizeServerUrl(input.url),
          apiKey: input.apiKey.trim(),
        }
      : account,
  );
  await writeAccounts(next);
}

export async function deleteAccount(id: string): Promise<void> {
  const accounts = await listAccounts();
  const next = accounts.filter((account) => account.id !== id);
  await writeAccounts(next);

  // Don't leave the active pointer dangling at a deleted account.
  const activeId = await LocalStorage.getItem<string>(ACTIVE_ACCOUNT_KEY);
  if (activeId === id) {
    if (next.length > 0) {
      await setActiveAccountId(next[0].id);
    } else {
      await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  }
}

export async function setActiveAccountId(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
}

/**
 * Resolves the account commands should be talking to. Falls back to the first account when the
 * stored pointer is missing or stale, so the extension is never stuck with nothing selected.
 */
export async function getActiveAccount(): Promise<DokployAccount | undefined> {
  const accounts = await listAccounts();
  if (accounts.length === 0) return undefined;

  const activeId = await LocalStorage.getItem<string>(ACTIVE_ACCOUNT_KEY);
  return accounts.find((account) => account.id === activeId) ?? accounts[0];
}
