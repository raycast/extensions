import { LocalStorage } from "@raycast/api";
import { HISTORY_STORAGE_KEY, FAVORITES_STORAGE_KEY, MAX_HISTORY_ITEMS } from "../constants";

export interface HistoryItem {
  id: string;
  type: string;
  value: string;
  masked?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  generatedAt: string;
  isFavorite?: boolean;
}

export async function getHistory(): Promise<HistoryItem[]> {
  const historyJson = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
  if (!historyJson) return [];

  try {
    return JSON.parse(historyJson);
  } catch {
    return [];
  }
}

export async function addToHistory(item: Omit<HistoryItem, "id" | "generatedAt">): Promise<void> {
  const history = await getHistory();

  const newItem: HistoryItem = {
    ...item,
    id: generateId(),
    generatedAt: new Date().toISOString(),
  };

  history.unshift(newItem);

  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(MAX_HISTORY_ITEMS);
  }

  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export async function removeFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

export async function getFavorites(): Promise<HistoryItem[]> {
  const favoritesJson = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
  if (!favoritesJson) return [];

  try {
    return JSON.parse(favoritesJson);
  } catch {
    return [];
  }
}

export async function toggleFavorite(item: HistoryItem): Promise<void> {
  const favorites = await getFavorites();
  const existingIndex = favorites.findIndex((fav) => fav.id === item.id);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({ ...item, isFavorite: true });
  }

  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));

  const history = await getHistory();
  const historyItem = history.find((h) => h.id === item.id);
  if (historyItem) {
    historyItem.isFavorite = existingIndex < 0;
    await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }
}

export async function searchHistory(query: string): Promise<HistoryItem[]> {
  const history = await getHistory();
  const lowerQuery = query.toLowerCase();

  return history.filter(
    (item) =>
      item.type.toLowerCase().includes(lowerQuery) ||
      item.value.toLowerCase().includes(lowerQuery) ||
      (item.masked && item.masked.toLowerCase().includes(lowerQuery)),
  );
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
