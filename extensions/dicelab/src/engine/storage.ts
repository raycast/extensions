// LocalStorage wrapper for context persistence

import { LocalStorage } from "@raycast/api";

const ALIASES_KEY = "dicelab:aliases";
const HISTORY_KEY = "dicelab:history";
const MAX_HISTORY = 100;

export interface HistoryEntry {
  expression: string;
  result: string;
  timestamp: number;
}

// Aliases
export async function loadAliases(): Promise<Record<string, unknown>> {
  const stored = await LocalStorage.getItem<string>(ALIASES_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export async function saveAliases(
  aliases: Record<string, unknown>,
): Promise<void> {
  await LocalStorage.setItem(ALIASES_KEY, JSON.stringify(aliases));
}

export async function clearAliases(): Promise<void> {
  await LocalStorage.removeItem(ALIASES_KEY);
}

// History
export async function loadHistory(): Promise<HistoryEntry[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const history = await loadHistory();
  const updated = [entry, ...history].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

// Full reset
export async function resetAll(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem(ALIASES_KEY),
    LocalStorage.removeItem(HISTORY_KEY),
  ]);
}
