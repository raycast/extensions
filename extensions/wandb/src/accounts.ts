import { LocalStorage } from "@raycast/api";
import { readWandbKeyFromNetrc } from "./netrc";
import { getViewer } from "./wandb";

const ACCOUNTS_KEY = "wandb-accounts";
const LEGACY_KEY = "wandb-api-key";

export interface Account {
  username: string;
  key: string;
}

export async function getAccounts(): Promise<Account[]> {
  const raw = await LocalStorage.getItem<string>(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Account[];
  } catch {
    return [];
  }
}

async function saveAccounts(list: Account[]): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

/** Validate a key, resolve its username, and upsert (dedup by username). */
export async function addAccount(key: string): Promise<Account> {
  const viewer = await getViewer(key); // throws AuthError on a bad key
  const account: Account = { username: viewer.username, key };
  const list = await getAccounts();
  const next = [...list.filter((a) => a.username !== account.username), account];
  await saveAccounts(next);
  return account;
}

export async function removeAccount(username: string): Promise<Account[]> {
  const next = (await getAccounts()).filter((a) => a.username !== username);
  await saveAccounts(next);
  return next;
}

/** Additively import any keys found in the environment, ~/.netrc, and the legacy
 *  slot that aren't stored yet. Dedups by key (validation runs once per new key),
 *  so this is safe to call on every launch. */
export async function bootstrapAccounts(): Promise<Account[]> {
  const existing = await getAccounts();
  const knownKeys = new Set(existing.map((a) => a.key));

  const candidates: string[] = [];
  const add = (k?: string | null) => {
    if (k && !candidates.includes(k)) candidates.push(k);
  };

  // Any env var ending in WANDB_API_KEY (WANDB_API_KEY, LIQUID_WANDB_API_KEY, …).
  for (const [name, value] of Object.entries(process.env)) {
    if (/WANDB_API_KEY$/.test(name)) add(value);
  }
  add(await readWandbKeyFromNetrc());
  const legacy = await LocalStorage.getItem<string>(LEGACY_KEY);
  add(legacy);

  for (const key of candidates) {
    if (knownKeys.has(key)) continue; // already imported
    try {
      await addAccount(key);
    } catch {
      // skip keys that fail validation
    }
  }
  if (legacy) await LocalStorage.removeItem(LEGACY_KEY); // migrated into the list
  return getAccounts();
}
