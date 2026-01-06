import { LocalStorage } from "@raycast/api";

export interface HistoryItem {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  provider: string;
  model: string;
  style?: string;
  timestamp: number;
}

const HISTORY_KEY = "prompt_history";
const MAX_HISTORY_ITEMS = 20;

export async function getHistory(): Promise<HistoryItem[]> {
  const data = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as HistoryItem[];
  } catch {
    return [];
  }
}

export async function addToHistory(
  item: Omit<HistoryItem, "id" | "timestamp">,
): Promise<void> {
  const history = await getHistory();

  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    timestamp: Date.now(),
  };

  // Add new item at the beginning
  history.unshift(newItem);

  // Keep only the most recent items
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
