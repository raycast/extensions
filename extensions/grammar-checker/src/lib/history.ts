import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "grammar_check_history";
const MAX_ENTRIES = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface HistoryEntry {
  id: string;
  original: string;
  corrected: string;
  hadChanges: boolean;
  timestamp: number;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as HistoryEntry[];
    return cleanup(entries);
  } catch {
    return [];
  }
}

export async function addHistoryEntry(
  original: string,
  corrected: string,
): Promise<void> {
  const entries = await getHistory();

  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    original,
    corrected,
    hadChanges: original.trim() !== corrected.trim(),
    timestamp: Date.now(),
  };

  entries.unshift(entry);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(cleanup(entries)));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

function cleanup(entries: HistoryEntry[]): HistoryEntry[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return entries.filter((e) => e.timestamp > cutoff).slice(0, MAX_ENTRIES);
}
