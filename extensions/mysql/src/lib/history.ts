import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

export interface HistoryEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  sql: string;
  ok: boolean;
  favorite: boolean;
  ranAt: number;
}

// One key per entry avoids whole-array read-modify-write races across command processes.
const KEY_PREFIX = "mysql.history.";
const MAX_ENTRIES = 100;

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const all = await LocalStorage.allItems();
  const entries: HistoryEntry[] = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    try {
      entries.push(JSON.parse(value as string) as HistoryEntry);
    } catch {
      // ignore corrupt entries
    }
  }
  return entries.sort((a, b) => b.ranAt - a.ranAt);
}

export async function addHistory(entry: Omit<HistoryEntry, "id" | "favorite" | "ranAt">): Promise<void> {
  const id = randomUUID();
  await LocalStorage.setItem(keyFor(id), JSON.stringify({ ...entry, id, favorite: false, ranAt: Date.now() }));
  await trim();
}

async function trim(): Promise<void> {
  const entries = await listHistory();
  const favorites = entries.filter((e) => e.favorite);
  const keepNonFavorites = Math.max(0, MAX_ENTRIES - favorites.length);
  const overflow = entries.filter((e) => !e.favorite).slice(keepNonFavorites);
  await Promise.all(overflow.map((e) => LocalStorage.removeItem(keyFor(e.id))));
}

export async function toggleFavorite(id: string): Promise<void> {
  const raw = await LocalStorage.getItem<string>(keyFor(id));
  if (!raw) return;
  const entry = JSON.parse(raw) as HistoryEntry;
  entry.favorite = !entry.favorite;
  await LocalStorage.setItem(keyFor(id), JSON.stringify(entry));
}

export async function removeHistory(id: string): Promise<void> {
  await LocalStorage.removeItem(keyFor(id));
}

export async function clearHistory(): Promise<void> {
  const all = await LocalStorage.allItems();
  const keys = Object.keys(all).filter((key) => key.startsWith(KEY_PREFIX));
  await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
}
