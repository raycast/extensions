import { LocalStorage } from "@raycast/api";
import type { HistoryEntry } from "../hooks/useHistory";

const HISTORY_KEY = "deepseek_history";
const MAX_ENTRIES = 50;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  const trimmed = entries.slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}
