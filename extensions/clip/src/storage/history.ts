import { LocalStorage } from "@raycast/api";
import { ShortenResult } from "../types";

const STORAGE_KEY = "shorten-history";
const MAX_ENTRIES = 100;

export async function getHistory(): Promise<ShortenResult[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ShortenResult[];
  } catch {
    return [];
  }
}

export async function addToHistory(result: ShortenResult): Promise<void> {
  const history = await getHistory();
  const updated = [result, ...history].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function removeFromHistory(shortUrl: string): Promise<void> {
  const history = await getHistory();
  const updated = history.filter((entry) => entry.shortUrl !== shortUrl);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
