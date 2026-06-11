import { LocalStorage } from "@raycast/api";
import { HistoryEntry } from "./types";

const STORAGE_KEY = "hibp_history";
const MAX_HISTORY_ENTRIES = 50;

export async function getHistory(): Promise<HistoryEntry[]> {
  const json = await LocalStorage.getItem<string>(STORAGE_KEY);
  return json ? (JSON.parse(json) as HistoryEntry[]) : [];
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...history].slice(0, MAX_HISTORY_ENTRIES)));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
