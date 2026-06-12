import { LocalStorage } from "@raycast/api";
import { HistoryEntry } from "../types";

const KEY = "ipgeolocation-history";
const MAX = 25;

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  const deduped = history.filter((h) => h.query !== entry.query);
  const updated = [entry, ...deduped].slice(0, MAX);
  await LocalStorage.setItem(KEY, JSON.stringify(updated));
}

export async function removeFromHistory(
  query: string,
): Promise<HistoryEntry[]> {
  const history = await getHistory();
  const updated = history.filter((h) => h.query !== query);
  await LocalStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}
