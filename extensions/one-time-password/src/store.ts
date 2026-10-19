import { LocalStorage } from '@raycast/api';
import crypto from 'crypto';
import { Account, CreateAccount, normalizeAccount, reorderAccounts } from './model';

export { Account } from './model';
export type { CreateAccount } from './model';

const STORAGE_KEY = 'one-time-password-accounts';
const LAST_USED_ACCOUNT_KEY = 'one-time-password-last-used-account';
const UNNAMED_ACCOUNT = 'Unnamed account';
let mutationQueue: Promise<unknown> = Promise.resolve();

function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readRecords(): Promise<unknown[]> {
  const data: unknown = JSON.parse((await LocalStorage.getItem<string>(STORAGE_KEY)) || '[]');
  return Array.isArray(data) ? data : [];
}

// The original form didn't require a name, so saved accounts without one get a placeholder instead of being skipped.
// New and edited accounts still need a name.
function withName(record: unknown): unknown {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  const { name } = record as { name?: unknown };
  const unnamed = name === undefined || (typeof name === 'string' && !name.trim());
  return unnamed ? { ...record, name: UNNAMED_ACCOUNT } : record;
}

function parseRecord(record: unknown): Account | undefined {
  try {
    return normalizeAccount(withName(record));
  } catch {
    return undefined;
  }
}

// The original extension derived ids from the name and key, so an account added twice shares one id. Later copies
// get an id derived from it, which stays the same between reads and is saved with the next change.
function withUniqueIds(accounts: Account[]): Account[] {
  const taken = new Set(accounts.map((account) => account.id));
  const seen = new Set<string>();
  for (const account of accounts) {
    if (seen.has(account.id)) {
      let copy = 2;
      while (taken.has(`${account.id}-${copy}`)) copy++;
      account.id = `${account.id}-${copy}`;
      taken.add(account.id);
    }
    seen.add(account.id);
  }
  return accounts;
}

async function readAccounts(): Promise<Account[]> {
  return withUniqueIds((await readRecords()).flatMap((record) => parseRecord(record) ?? []));
}

// Earlier versions saved names and keys without validating them. Records that can't be read are skipped so they
// don't hide the other accounts, and written back unchanged so they aren't lost.
async function save(accounts: Account[]): Promise<void> {
  const unreadable = (await readRecords()).filter((record) => !parseRecord(record));
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify([...accounts, ...unreadable]));
}

export async function getAccounts(): Promise<Account[]> {
  await mutationQueue;
  return readAccounts();
}

function accountFromInput(input: CreateAccount | Account): Account {
  const record = input as Record<string, unknown>;
  return normalizeAccount({ ...record, id: record.id || crypto.randomUUID() });
}

// Identity includes the normalized label and issuer, so separate accounts sharing a seed are retained.
function identity(account: Account): string {
  return JSON.stringify([
    account.secret,
    account.algorithm,
    account.digits,
    account.period,
    account.issuer?.trim().toLocaleLowerCase() || '',
    account.name.trim().toLocaleLowerCase(),
  ]);
}

export async function addAccount(input: CreateAccount): Promise<Account> {
  const candidate = accountFromInput(input);
  return mutate(async () => {
    const accounts = await readAccounts();
    if (accounts.some((account) => identity(account) === identity(candidate)))
      throw new Error('Account already exists');
    if (accounts.some((account) => account.id === candidate.id)) candidate.id = crypto.randomUUID();
    await save([...accounts, candidate]);
    return candidate;
  });
}

export async function findAccount(input: CreateAccount): Promise<Account | undefined> {
  const key = identity(accountFromInput(input));
  return (await getAccounts()).find((account) => identity(account) === key);
}

export async function importAccounts(
  inputs: Array<CreateAccount | Account>,
): Promise<{ added: number; skipped: number }> {
  if (!Array.isArray(inputs) || inputs.length > 1000) throw new Error('Invalid account import');
  // Validate every input before the first write; one malformed record aborts the whole import.
  const candidates = inputs.map(accountFromInput);
  return mutate(async () => {
    const accounts = await readAccounts();
    const identities = new Set(accounts.map(identity));
    const ids = new Set(accounts.map((account) => account.id));
    let added = 0;
    let skipped = 0;
    for (const candidate of candidates) {
      const key = identity(candidate);
      if (identities.has(key)) {
        skipped++;
        continue;
      }
      if (ids.has(candidate.id)) candidate.id = crypto.randomUUID();
      accounts.push(candidate);
      identities.add(key);
      ids.add(candidate.id);
      added++;
    }
    if (added) await save(accounts);
    return { added, skipped };
  });
}

export async function removeAccount(id: string): Promise<void> {
  return mutate(async () => {
    const accounts = await readAccounts();
    const kept = accounts.filter((account) => account.id !== id);
    if (kept.length === accounts.length) return;
    await save(kept);
    if ((await LocalStorage.getItem<string>(LAST_USED_ACCOUNT_KEY)) === id) {
      await LocalStorage.removeItem(LAST_USED_ACCOUNT_KEY);
    }
  });
}

export async function updateAccount(input: Account | (CreateAccount & { id: string })): Promise<void> {
  const candidate = accountFromInput(input);
  return mutate(async () => {
    const accounts = await readAccounts();
    const index = accounts.findIndex((account) => account.id === candidate.id);
    if (index < 0) return;
    const updated = normalizeAccount({ ...accounts[index], ...input, id: candidate.id });
    if (accounts.some((account, accountIndex) => accountIndex !== index && identity(account) === identity(updated))) {
      throw new Error('Account already exists');
    }
    accounts[index] = updated;
    await save(accounts);
  });
}

// Saves a new order for the accounts of one section; see reorderAccounts.
export async function setOrder(ids: string[]): Promise<void> {
  return mutate(async () => save(reorderAccounts(await readAccounts(), ids)));
}

export async function toggleFavorite(id: string): Promise<void> {
  return mutate(async () => {
    const accounts = await readAccounts();
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    account.favorite = !account.favorite;
    await save(accounts);
  });
}

export async function setLastUsedAccountId(id: string): Promise<void> {
  return mutate(async () => {
    const accounts = await readAccounts();
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    account.lastUsedAt = Date.now();
    account.useCount += 1;
    await save(accounts);
    await LocalStorage.setItem(LAST_USED_ACCOUNT_KEY, id);
  });
}

export async function clearRecents(): Promise<void> {
  return mutate(async () => {
    const accounts = await readAccounts();
    for (const account of accounts) {
      delete account.lastUsedAt;
      account.useCount = 0;
    }
    await save(accounts);
    await LocalStorage.removeItem(LAST_USED_ACCOUNT_KEY);
  });
}

export async function getLastUsedAccount(): Promise<Account | undefined> {
  const accounts = await getAccounts();
  const id = await LocalStorage.getItem<string>(LAST_USED_ACCOUNT_KEY);
  return (
    accounts.find((account) => account.id === id) ??
    accounts
      .filter((account) => account.lastUsedAt !== undefined)
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))[0]
  );
}
