import { LocalStorage } from "@raycast/api";
import type { ColorDescription } from "./types";

const HISTORY_KEY = "color-history";
const MAX_HISTORY = 50;

export interface HistoryEntry {
  hex: string;
  basicName: string;
  detailedDescription: string;
  timestamp: number;
}

function toHistoryEntry(desc: ColorDescription): HistoryEntry {
  return {
    hex: desc.hex,
    basicName: desc.basicName,
    detailedDescription: desc.detailedDescription,
    timestamp: Date.now(),
  };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function addToHistory(desc: ColorDescription): Promise<void> {
  const history = await getHistory();
  const entry = toHistoryEntry(desc);

  // Remove duplicate if same hex already exists
  const filtered = history.filter((h) => h.hex !== entry.hex);

  // Add to front, cap at MAX_HISTORY
  filtered.unshift(entry);
  if (filtered.length > MAX_HISTORY) {
    filtered.length = MAX_HISTORY;
  }

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
