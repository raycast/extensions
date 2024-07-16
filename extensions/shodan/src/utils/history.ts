// src/utils/history.ts
import { LocalStorage } from "@raycast/api";

const HISTORY_STORAGE_KEY = "shodan_api_history";
const MAX_HISTORY_ITEMS = 50;

interface HistoryItem {
  method: string;
  params: Record<string, string>;
  timestamp: number;
}

export async function addToHistory(method: string, params: Record<string, string>): Promise<void> {
  const history = await getHistory();
  const newItem: HistoryItem = { method, params, timestamp: Date.now() };
  history.unshift(newItem);
  if (history.length > MAX_HISTORY_ITEMS) {
    history.pop();
  }
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export async function getHistory(): Promise<HistoryItem[]> {
  const historyData = await LocalStorage.getItem(HISTORY_STORAGE_KEY);
  return historyData ? JSON.parse(historyData as string) : [];
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}
