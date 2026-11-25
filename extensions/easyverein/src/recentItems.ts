import { LocalStorage } from "@raycast/api";
import { MenuItem } from "./shared/registry";

const MAX_RECENT_ITEMS = 5;
const STORAGE_KEY = "commandMenu:recent";
const TTL_MS = 60 * 60 * 1000;

interface StoredRecent {
  items: MenuItem[];
  expiresAt: number;
}

/** Reads the recently opened items, most recent first; they expire one hour after the last one. */
export async function readRecentItems(): Promise<MenuItem[]> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const stored = JSON.parse(raw) as StoredRecent;
    if (!Array.isArray(stored.items) || Date.now() > stored.expiresAt) {
      await LocalStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return stored.items;
  } catch {
    return [];
  }
}

/** Remembers an opened item and returns the new recent items. */
export async function addRecentItem(item: MenuItem): Promise<MenuItem[]> {
  const items = [
    item,
    ...(await readRecentItems()).filter((recent) => recent.id !== item.id),
  ].slice(0, MAX_RECENT_ITEMS);
  await writeRecentItems(items);
  return items;
}

/** Removes one item from the recent items and returns the rest. */
export async function removeRecentItem(id: string): Promise<MenuItem[]> {
  const items = (await readRecentItems()).filter((recent) => recent.id !== id);
  await writeRecentItems(items);
  return items;
}

/** Removes all recent items. */
export async function clearRecentItems(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

async function writeRecentItems(items: MenuItem[]): Promise<void> {
  const stored: StoredRecent = { items, expiresAt: Date.now() + TTL_MS };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}
