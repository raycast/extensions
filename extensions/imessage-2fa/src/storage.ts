import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";

export interface Account {
  id: string;
  name: string;
}

const ACCOUNTS_STORAGE_KEY = "gmail-accounts";

/**
 * Get all stored Gmail accounts
 */
export async function getAccounts(): Promise<Account[]> {
  const accountsJson = await LocalStorage.getItem<string>(ACCOUNTS_STORAGE_KEY);
  if (!accountsJson) {
    return [];
  }
  try {
    return JSON.parse(accountsJson);
  } catch (error) {
    console.error("Failed to parse accounts from LocalStorage:", error);
    return [];
  }
}

/**
 * Save accounts to LocalStorage
 */
async function saveAccounts(accounts: Account[]): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

/**
 * Add a new Gmail account
 */
export async function addAccount(name: string): Promise<Account> {
  const accounts = await getAccounts();

  // Check if name already exists
  if (accounts.some((acc) => acc.name === name)) {
    throw new Error(`Account with name "${name}" already exists`);
  }

  const newAccount: Account = {
    id: randomUUID(),
    name,
  };

  accounts.push(newAccount);
  await saveAccounts(accounts);

  return newAccount;
}

/**
 * Remove a Gmail account by ID
 */
export async function removeAccount(accountId: string): Promise<void> {
  const accounts = await getAccounts();
  const filtered = accounts.filter((acc) => acc.id !== accountId);
  await saveAccounts(filtered);
}

/**
 * Rename a Gmail account
 */
export async function renameAccount(accountId: string, newName: string): Promise<void> {
  const accounts = await getAccounts();

  // Check if new name already exists (excluding current account)
  if (accounts.some((acc) => acc.id !== accountId && acc.name === newName)) {
    throw new Error(`Account with name "${newName}" already exists`);
  }

  const account = accounts.find((acc) => acc.id === accountId);
  if (!account) {
    throw new Error(`Account with ID "${accountId}" not found`);
  }

  account.name = newName;
  await saveAccounts(accounts);
}

/**
 * Get a specific account by ID
 */
export async function getAccount(accountId: string): Promise<Account | undefined> {
  const accounts = await getAccounts();
  return accounts.find((acc) => acc.id === accountId);
}
