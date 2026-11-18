import { LocalStorage } from "@raycast/api";

export type HistoryEntry = {
  url: string;
  title: string;
  timestamp: number;
};

const HISTORY_KEY = "send-to-kindle-history";
const MAX_HISTORY_ITEMS = 100;

export async function addToHistory(entry: Omit<HistoryEntry, "timestamp">) {
  const history = await getHistory();
  const newEntry: HistoryEntry = { ...entry, timestamp: Date.now() };

  // Remove duplicates based on URL (keeping the new one)
  const filteredHistory = history.filter((item) => item.url !== entry.url);

  const newHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!historyJson) {
    return [];
  }
  try {
    return JSON.parse(historyJson) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function clearHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function removeFromHistory(url: string) {
  const history = await getHistory();
  const newHistory = history.filter((item) => item.url !== url);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}
