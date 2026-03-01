import { LocalStorage } from "@raycast/api";
import type { SearchQuery } from "@filipkillander/radiokollen-sdk";

const STORAGE_KEY = "radiokollen-history-v1";
const HISTORY_LIMIT = 10;

export type HistoryItem = {
  id: string;
  savedAt: string;
  query: SearchQuery;
};

export async function loadHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isHistoryItem);
  } catch {
    return [];
  }
}

export async function saveHistory(query: SearchQuery): Promise<HistoryItem[]> {
  const previous = await loadHistory();
  const now = new Date().toISOString();

  const entry: HistoryItem = {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    savedAt: now,
    query,
  };

  const deduplicated = previous.filter(
    (item) => JSON.stringify(item.query) !== JSON.stringify(query),
  );
  const next = [entry, ...deduplicated].slice(0, HISTORY_LIMIT);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeHistoryItem(
  itemId: string,
): Promise<HistoryItem[]> {
  const previous = await loadHistory();
  const next = previous.filter((item) => item.id !== itemId);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HistoryItem>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.savedAt === "string" &&
    !!candidate.query &&
    typeof candidate.query === "object"
  );
}
