import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { type ParsedAccount } from "./totp";

const storageKey = "accounts";

export type Account = ParsedAccount & { id: string };

export async function loadAccounts(): Promise<Account[]> {
  const saved = await LocalStorage.getItem<string>(storageKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved) as Account[];
  } catch {
    return [];
  }
}

export async function saveAccount(input: ParsedAccount): Promise<void> {
  const accounts = await loadAccounts();
  accounts.push({ id: randomUUID(), ...input });
  await save(accounts);
}

export async function removeAccount(id: string): Promise<void> {
  await save((await loadAccounts()).filter((account) => account.id !== id));
}

export async function mergeAccounts(imported: Account[]): Promise<number> {
  const accounts = await loadAccounts();
  const existing = new Set(accounts.map((account) => `${account.id}\0${account.name}\0${account.secret}`));
  const additions = imported.filter((account) => !existing.has(`${account.id}\0${account.name}\0${account.secret}`));
  await save([...accounts, ...additions]);
  return additions.length;
}

async function save(accounts: Account[]): Promise<void> {
  await LocalStorage.setItem(
    storageKey,
    JSON.stringify(accounts.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))),
  );
}
