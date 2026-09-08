import { LocalStorage } from "@raycast/api";
import { HistoryEntry } from "../types";

const HISTORY_KEY = "transcription-history";

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function addHistoryEntry(entry: HistoryEntry, maxEntries: number, retentionDays: number): Promise<void> {
  const entries = await loadHistory();
  entries.unshift(entry);

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const filtered = entries.filter((e) => e.timestamp >= cutoff);
  const trimmed = filtered.slice(0, maxEntries);

  await saveHistory(trimmed);
}

export async function pruneHistory(maxEntries: number, retentionDays: number): Promise<void> {
  const entries = await loadHistory();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const filtered = entries.filter((e) => e.timestamp >= cutoff);
  const trimmed = filtered.slice(0, maxEntries);
  if (trimmed.length !== entries.length) {
    await saveHistory(trimmed);
  }
}
