import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { HistoryEntry } from "./types";

const STORAGE_KEY = "check-history";

interface Preferences {
  maxHistory: string;
}

function getMaxHistory(): number {
  const { maxHistory } = getPreferenceValues<Preferences>();
  const n = parseInt(maxHistory, 10);
  return isNaN(n) ? 50 : n;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  // Add to front
  history.unshift(entry);
  // Cap at max
  const max = getMaxHistory();
  const trimmed = history.slice(0, max);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export async function removeHistoryEntry(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((entry) => entry.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
