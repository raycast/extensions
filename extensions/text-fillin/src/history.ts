import { LocalStorage } from "@raycast/api";

export const HISTORY_STORAGE_KEY = "text-fillin-history";
export const MAX_HISTORY_ITEMS = 50;

export type HistoryItem = {
  id: string;
  text: string;
  createdAt: string;
};

export async function loadHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendHistory(text: string) {
  const history = await loadHistory();
  const next: HistoryItem = {
    id: generateId(),
    text,
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...history].slice(0, MAX_HISTORY_ITEMS);
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
