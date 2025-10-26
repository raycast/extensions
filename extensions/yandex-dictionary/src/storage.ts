import { LocalStorage } from "@raycast/api";
import type { HistoryItem } from "./types";

const HISTORY_KEY = "ya-dictionary-history";
const HISTORY_LIMIT = 50;

export async function addToHistory(item: HistoryItem) {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  const history: HistoryItem[] = raw ? JSON.parse(raw) : [];
  history.unshift(item);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
}

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}
