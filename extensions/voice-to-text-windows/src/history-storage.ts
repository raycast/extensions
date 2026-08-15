import { LocalStorage } from "@raycast/api";

export type PromptMode = "general" | "email" | "slack" | "notes" | "custom";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  rawTranscription: string;
  cleanedText: string;
  mode: PromptMode;
}

const STORAGE_KEY = "transcription-history";
const MAX_ENTRIES = 100;

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "timestamp">): Promise<void> {
  const history = await getHistory();
  history.unshift({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((e) => e.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

// --- Active mode (overrides preference) ---

const MODE_KEY = "active-prompt-mode";

export async function getActiveMode(): Promise<PromptMode | null> {
  const val = await LocalStorage.getItem<string>(MODE_KEY);
  return (val as PromptMode) || null;
}

export async function setActiveMode(mode: PromptMode): Promise<void> {
  await LocalStorage.setItem(MODE_KEY, mode);
}
