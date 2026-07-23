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

const STORAGE_KEY = "opensearch.history";
const MAX_ENTRIES = 100;

// Serializes read-modify-write updates so concurrent completions can't clobber
// each other's entries (LocalStorage has no atomic update primitive).
let writeQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const entries = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  return entries.sort((a, b) => b.ranAt - a.ranAt);
}

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "favorite" | "ranAt">): Promise<void> {
  return serialize(async () => {
    const entries = await listHistory();
    entries.unshift({ ...entry, id: randomUUID(), favorite: false, ranAt: Date.now() });

    // Keep every favorite, then fill up to MAX_ENTRIES with the most recent entries.
    const favorites = entries.filter((e) => e.favorite);
    const recent = entries.filter((e) => !e.favorite).slice(0, Math.max(0, MAX_ENTRIES - favorites.length));
    await saveHistory([...favorites, ...recent]);
  });
}

export function toggleFavorite(id: string): Promise<void> {
  return serialize(async () => {
    const entries = await listHistory();
    const entry = entries.find((e) => e.id === id);
    if (entry) entry.favorite = !entry.favorite;
    await saveHistory(entries);
  });
}

export function removeHistory(id: string): Promise<void> {
  return serialize(async () => {
    const entries = (await listHistory()).filter((e) => e.id !== id);
    await saveHistory(entries);
  });
}

export function clearHistory(): Promise<void> {
  return serialize(() => LocalStorage.removeItem(STORAGE_KEY));
}
