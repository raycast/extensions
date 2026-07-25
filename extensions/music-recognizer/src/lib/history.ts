import { LocalStorage } from "@raycast/api";
import type { RecognizedTrack } from "./types";

const STORAGE_KEY = "recognition-history";
const MAX_ENTRIES = 200;

export async function getHistory(): Promise<RecognizedTrack[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecognizedTrack[];
  } catch {
    return [];
  }
}

export async function addToHistory(track: RecognizedTrack): Promise<void> {
  const history = await getHistory();
  history.unshift(track);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
}

export async function removeFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history.filter((t) => t.id !== id)));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
