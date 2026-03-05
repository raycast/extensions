import { LocalStorage } from "@raycast/api";
import { ClipboardEntry } from "../interfaces/clipboardEntry.interface";
import { MAX_HISTORY_ITEMS, STORAGE_KEY } from "../constants";

export async function getHistoryFromStorage(): Promise<ClipboardEntry[]> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return [];

    const history = JSON.parse(raw);
    if (!Array.isArray(history)) throw new Error("Invalid storage history");

    return history as ClipboardEntry[];
  } catch (error) {
    console.error("Failed to get clipboard history from storage", error);
    throw error;
  }
}

export async function updateStorageHistory(
  newState: ClipboardEntry[],
  setHistory?: React.Dispatch<React.SetStateAction<ClipboardEntry[]>>,
) {
  const sorted = [...newState].sort((a, b) => Number(b.favorite) - Number(a.favorite));
  const sliced = sorted.slice(0, MAX_HISTORY_ITEMS);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(sliced));
  setHistory?.(sliced);
}
