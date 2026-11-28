import { LocalStorage } from "@raycast/api";
import { getAccountKey } from "./api";
import { MenuItem } from "./shared/registry";

const MAX_RECENT_ITEMS = 5;
const TTL_MS = 60 * 60 * 1000;

function storageKey(): string {
  return `commandMenu:recent:${getAccountKey()}`;
}

interface StoredRecent {
  items: MenuItem[];
  expiresAt: number;
}

/** Reads the recently opened items, most recent first; they expire one hour after the last one. */
export async function readRecentItems(): Promise<MenuItem[]> {
  try {
    const raw = await LocalStorage.getItem<string>(storageKey());
    if (!raw) {
      return [];
    }
    const stored = JSON.parse(raw) as StoredRecent;
    if (!Array.isArray(stored.items) || Date.now() > stored.expiresAt) {
      await LocalStorage.removeItem(storageKey());
      return [];
    }
    return stored.items;
  } catch {
    return [];
  }
}

/** Remembers an opened item. */
export async function addRecentItem(item: MenuItem): Promise<void> {
  const items = [item, ...(await readRecentItems()).filter((recent) => recent.id !== item.id)].slice(
    0,
    MAX_RECENT_ITEMS,
  );
  await writeRecentItems(items);
}

export async function removeRecentItem(id: string): Promise<void> {
  const items = (await readRecentItems()).filter((recent) => recent.id !== id);
  await writeRecentItems(items);
}

export async function clearRecentItems(): Promise<void> {
  await LocalStorage.removeItem(storageKey());
}

async function writeRecentItems(items: MenuItem[]): Promise<void> {
  const stored: StoredRecent = { items, expiresAt: Date.now() + TTL_MS };
  await LocalStorage.setItem(storageKey(), JSON.stringify(stored));
}
