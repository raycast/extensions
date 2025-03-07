import type { Website, HistoryEntry, ActionType, Preferences } from "./types";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

const HISTORY_KEY = "history";

export async function getHistory(): Promise<HistoryEntry[]> {
  const history = await LocalStorage.getItem<string>(HISTORY_KEY);

  if (!history) {
    return [];
  }

  let entries: HistoryEntry[] = [];

  try {
    entries = JSON.parse(history);
  } catch {
    return [];
  }

  const preferences = getPreferenceValues<Preferences>();
  const retentionDays = Number.parseInt(preferences.historyRetention || "30", 10);

  // If retention is 0, keep all entries
  if (retentionDays === 0) {
    return entries;
  }

  // Filter out entries older than retention period
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => entry.timestamp >= cutoffTime);
}

export async function addToHistory(website: Website, action: ActionType): Promise<void> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const historySize = Number.parseInt(preferences.historySize || "50", 10);

    const history = await getHistory(); // This will already filter by retention period
    const newEntry: HistoryEntry = {
      website,
      timestamp: Date.now(),
      action,
    };

    // Add new entry and limit size
    const updatedHistory = [newEntry, ...history].slice(0, historySize);

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    throw new Error(`Failed to add entry to history: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function removeFromHistory(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  const updatedHistory = history.filter(
    (e) => !(e.website.name === entry.website.name && e.timestamp === entry.timestamp),
  );
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
