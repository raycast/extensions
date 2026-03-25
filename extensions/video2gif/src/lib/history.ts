import { LocalStorage } from "@raycast/api";
import { HistoryEntry } from "../types";

const HISTORY_KEY = "conversion_history";
const HISTORY_BACKUP_KEY = "conversion_history_backup";
const MAX_ENTRIES = 5;

/**
 * Get recent conversion history (last 5 entries)
 */
export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("History data is not an array, resetting");
      await LocalStorage.setItem(HISTORY_BACKUP_KEY, raw);
      return [];
    }
    return parsed as HistoryEntry[];
  } catch (error) {
    console.error("Failed to parse history JSON, data may be corrupted:", error);
    await LocalStorage.setItem(HISTORY_BACKUP_KEY, raw);
    return [];
  }
}

/**
 * Add a new entry to the conversion history
 */
export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  history.unshift(entry);

  // Keep only the last MAX_ENTRIES
  const trimmed = history.slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * Clear all conversion history
 */
export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
