import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";

export interface Account {
  id: string;
  name: string;
}

const ACCOUNTS_STORAGE_KEY = "gmail-accounts";

export async function getAccounts(): Promise<Account[]> {
  const accountsJson = await LocalStorage.getItem<string>(ACCOUNTS_STORAGE_KEY);
  if (!accountsJson) return [];

  try {
    return JSON.parse(accountsJson);
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: Account[]): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export async function addAccount(name: string): Promise<Account> {
  const accounts = await getAccounts();

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

export async function removeAccount(accountId: string): Promise<void> {
  const accounts = await getAccounts();
  await saveAccounts(accounts.filter((acc) => acc.id !== accountId));
}

export async function renameAccount(accountId: string, newName: string): Promise<void> {
  const accounts = await getAccounts();

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
