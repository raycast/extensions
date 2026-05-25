import { LocalStorage } from "@raycast/api";
import { SyncHistoryEntry } from "../types";

const HISTORY_KEY = "sync-history";
const MAX_HISTORY = 50;

export async function getSyncHistory(): Promise<SyncHistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncHistoryEntry[];
  } catch {
    return [];
  }
}

export async function addSyncHistory(entry: SyncHistoryEntry): Promise<void> {
  const history = await getSyncHistory();
  history.unshift(entry);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export async function clearSyncHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
