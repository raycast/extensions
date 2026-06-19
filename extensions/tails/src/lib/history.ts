import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

const HISTORY_KEY = "tails-download-history";
const MAX_ENTRIES = 500;

export interface HistoryEntry {
  id: string;
  url: string;
  filename: string;
  downloadPath: string;
  platform: string;
  timestamp: number;
  status: "completed" | "failed";
  errorMessage?: string;
  thumbnailUrl: string | null;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!stored) return [];

  const parsed = JSON.parse(stored) as HistoryEntry[];
  return parsed.sort((a, b) => b.timestamp - a.timestamp);
}

export function addToHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): void {
  void (async () => {
    try {
      const history = await loadHistory();

      history.unshift({
        ...entry,
        id: randomUUID(),
        timestamp: Date.now(),
      });

      if (history.length > MAX_ENTRIES) {
        history.splice(MAX_ENTRIES);
      }

      await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      return;
    }
  })();
}

export async function removeHistoryEntry(id: string): Promise<HistoryEntry[]> {
  const history = await loadHistory();
  const filtered = history.filter((e) => e.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  return filtered;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
