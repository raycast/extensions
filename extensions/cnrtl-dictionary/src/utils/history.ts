import { LocalStorage } from "@raycast/api";
import { DEFAULT_HISTORY_SIZE, HISTORY_STORAGE_KEY } from "./constants";
import type { CnrtlEndpoint, HistoryEntry } from "./types";

/**
 * Load the full history list from LocalStorage.
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Persist the history list to LocalStorage.
 */
async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Add a word to the history, respecting the configured size limit.
 * Duplicates (same word + endpoint) are moved to the front.
 */
export async function addToHistory(
  word: string,
  endpoint: CnrtlEndpoint,
  maxSize: number = DEFAULT_HISTORY_SIZE
): Promise<void> {
  if (maxSize <= 0) return;

  const entries = await loadHistory();

  // Remove existing entry for the same word/endpoint
  const filtered = entries.filter(
    (e) => !(e.word === word && e.endpoint === endpoint)
  );

  // Prepend new entry
  filtered.unshift({ word, endpoint, timestamp: Date.now() });

  // Trim to max size
  const trimmed = filtered.slice(0, maxSize);

  await saveHistory(trimmed);
}

/**
 * Remove a specific entry from history.
 */
export async function removeFromHistory(
  word: string,
  endpoint: CnrtlEndpoint
): Promise<void> {
  const entries = await loadHistory();
  await saveHistory(entries.filter((e) => !(e.word === word && e.endpoint === endpoint)));
}

/**
 * Clear the entire history.
 */
export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

/**
 * Return the most recent unique words across all endpoints.
 */
export async function getRecentWords(limit = 10): Promise<string[]> {
  const entries = await loadHistory();
  const seen = new Set<string>();
  const words: string[] = [];
  for (const e of entries) {
    if (!seen.has(e.word)) {
      seen.add(e.word);
      words.push(e.word);
    }
    if (words.length >= limit) break;
  }
  return words;
}
