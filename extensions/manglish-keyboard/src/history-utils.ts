import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "transliteration-history";
const MAX_HISTORY = 20;

export type HistoryItem = {
  input: string;
  output: string;
  timestamp: number;
};

export async function addToHistory(input: string, output: string) {
  const existing = await getHistory();
  const filtered = existing.filter((h) => h.input !== input);
  const updated = [{ input, output, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export async function clearHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}
