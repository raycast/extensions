import { LocalStorage } from "@raycast/api";
import { HistoryItem } from "./types";

const HISTORY_KEY = "odesli-history";
const MAX_HISTORY_ITEMS = 100;

export async function getHistory(): Promise<HistoryItem[]> {
  const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!historyJson) {
    return [];
  }
  try {
    return JSON.parse(historyJson);
  } catch {
    return [];
  }
}

export async function addToHistory(item: Omit<HistoryItem, "id" | "timestamp" | "isFavorite">): Promise<HistoryItem> {
  const history = await getHistory();

  // Check if URL already exists
  const existingIndex = history.findIndex((h) => h.originalUrl === item.originalUrl);

  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    timestamp: Date.now(),
    isFavorite: existingIndex >= 0 ? history[existingIndex].isFavorite : false,
  };

  // Remove existing item if found
  if (existingIndex >= 0) {
    history.splice(existingIndex, 1);
  }

  // Add to beginning of array
  history.unshift(newItem);

  // Trim to max items
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));

  return newItem;
}

export async function toggleFavorite(id: string): Promise<void> {
  const history = await getHistory();
  const item = history.find((h) => h.id === id);

  if (item) {
    item.isFavorite = !item.isFavorite;
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((h) => h.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

export async function getFavorites(): Promise<HistoryItem[]> {
  const history = await getHistory();
  return history.filter((item) => item.isFavorite);
}
