import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

export interface HistoryEntry {
  id: string;
  sql: string;
  connectionName: string;
  ranAt: number;
  durationMs: number;
  /** "SELECT 12", "UPDATE 3", or the error message when the statement failed. */
  outcome: string;
  succeeded: boolean;
  favorite?: boolean;
}

const STORAGE_KEY = "postgres.history";
const MAX_ENTRIES = 100;

export async function listHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const entries = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  return entries.sort((a, b) => b.ranAt - a.ranAt);
}

async function save(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function recordHistory(entry: Omit<HistoryEntry, "id" | "ranAt">): Promise<void> {
  const entries = await listHistory();
  entries.unshift({ ...entry, id: randomUUID(), ranAt: Date.now() });
  // Favorites are kept regardless of age; only the unpinned tail is trimmed.
  const favorites = entries.filter((e) => e.favorite);
  const rest = entries.filter((e) => !e.favorite).slice(0, MAX_ENTRIES);
  await save([...favorites, ...rest]);
}

export async function toggleFavorite(id: string): Promise<void> {
  const entries = await listHistory();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  entry.favorite = !entry.favorite;
  await save(entries);
}

export async function removeHistoryEntry(id: string): Promise<void> {
  await save((await listHistory()).filter((e) => e.id !== id));
}

export async function clearHistory(): Promise<void> {
  await save((await listHistory()).filter((e) => e.favorite));
}
