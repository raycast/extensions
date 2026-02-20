import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "word_history";
const MAX_HISTORY_SIZE = 30;

export interface HistoryItem {
  word: string;
  timestamp: number;
}

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

export async function addToHistory(word: string): Promise<void> {
  const history = await getHistory();

  // Remove existing entry if word already exists
  const filteredHistory = history.filter((item) => item.word.toLowerCase() !== word.toLowerCase());

  // Add new entry at the beginning
  const newHistory: HistoryItem[] = [{ word, timestamp: Date.now() }, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}

export async function removeFromHistory(word: string): Promise<void> {
  const history = await getHistory();
  const filteredHistory = history.filter((item) => item.word.toLowerCase() !== word.toLowerCase());
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
