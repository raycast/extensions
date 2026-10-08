import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import type { HttpMethod } from "./client";

export interface HistoryEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  method: HttpMethod;
  path: string;
  body?: string;
  status?: number;
  favorite: boolean;
  ranAt: number;
}

// Each entry is stored under its own key (`opensearch.history.<id>`) rather than in a
// single array. This avoids whole-array read-modify-write races: concurrent commands
// (in separate Raycast processes) touch independent keys, so no update clobbers another.
const KEY_PREFIX = "opensearch.history.";
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
  const record: HistoryEntry = { ...entry, id, favorite: false, ranAt: Date.now() };
  await LocalStorage.setItem(keyFor(id), JSON.stringify(record));
  await trim();
}

// Best-effort cap: keep every favorite plus the most recent non-favorites up to MAX_ENTRIES.
async function trim(): Promise<void> {
  const entries = await listHistory();
  const favorites = entries.filter((e) => e.favorite);
  const keepNonFavorites = Math.max(0, MAX_ENTRIES - favorites.length);
  const overflow = entries.filter((e) => !e.favorite).slice(keepNonFavorites);
  await Promise.all(overflow.map((e) => LocalStorage.removeItem(keyFor(e.id))));
}

// Takes the desired end state rather than flipping the stored value, so the write is
// idempotent. A relative toggle (`favorite = !favorite`) is a read-modify-write that
// loses updates when two processes flip the same entry concurrently: both read `false`
// and both write `true`, silently dropping one of the two intended flips. Writing an
// explicit target value has no such dependency on the value most recently read.
export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  const raw = await LocalStorage.getItem<string>(keyFor(id));
  if (!raw) return;
  const entry = JSON.parse(raw) as HistoryEntry;
  if (entry.favorite === favorite) return;
  await LocalStorage.setItem(keyFor(id), JSON.stringify({ ...entry, favorite }));
}

export async function removeHistory(id: string): Promise<void> {
  await LocalStorage.removeItem(keyFor(id));
}

export async function clearHistory(): Promise<void> {
  const all = await LocalStorage.allItems();
  const keys = Object.keys(all).filter((key) => key.startsWith(KEY_PREFIX));
  await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
}
