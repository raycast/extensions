import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { writeBackup } from "./backup";
import { type ParsedAccount } from "./totp";

const storageKey = "accounts";
let mutationQueue = Promise.resolve();

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

export function saveAccount(input: ParsedAccount): Promise<void> {
  return mutate(async () => {
    const accounts = await loadAccounts();
    accounts.push({ id: randomUUID(), ...input });
    await save(accounts);
  });
}

export function updateAccount(id: string, input: ParsedAccount): Promise<void> {
  return mutate(async () => {
    const accounts = await loadAccounts();
    const index = accounts.findIndex((account) => account.id === id);
    if (index < 0) throw new Error("Account not found.");
    accounts[index] = { id, ...input };
    await save(accounts);
  });
}

export function removeAccount(id: string): Promise<void> {
  return mutate(async () => save((await loadAccounts()).filter((account) => account.id !== id)));
}

export function mergeAccounts(imported: Account[]): Promise<number> {
  return mutate(async () => {
    const accounts = await loadAccounts();
    const existing = new Set(accounts.map(accountKey));
    const additions: Account[] = [];
    for (const account of imported) {
      if (existing.has(accountKey(account))) continue;
      const addition = { ...account, id: randomUUID() };
      additions.push(addition);
      existing.add(accountKey(addition));
    }
    await save([...accounts, ...additions]);
    return additions.length;
  });
}

function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function accountKey(account: Account): string {
  return `${account.name}\0${account.issuer}\0${account.secret}`;
}

async function save(accounts: Account[]): Promise<void> {
  const sorted = accounts.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  const { backupDirectory, backupPassphrase } = getPreferenceValues<{
    backupDirectory?: string;
    backupPassphrase?: string;
  }>();
  if (backupDirectory || backupPassphrase) {
    if (!backupDirectory || !backupPassphrase) throw new Error("Set both Automatic Backup preferences or clear both to disable it.");
    await writeBackup(sorted, backupPassphrase, join(backupDirectory, "totp-backup.json"));
  }
  await LocalStorage.setItem(storageKey, JSON.stringify(sorted));
}
