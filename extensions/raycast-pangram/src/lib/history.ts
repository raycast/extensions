import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "pangram_history";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface HistoryEntry {
  id: string;
  timestamp: number;
  headline: string;
  wordCount: number;
  preview: string; // first 50 words of original text
  resultMarkdown: string;
  // Debug fields — optional so existing stored entries remain valid
  rawText?: string;
  rawResponse?: string; // JSON.stringify of the full Pangram API response
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as HistoryEntry[];
    // Drop anything older than 7 days on every read
    return entries.filter((e) => Date.now() - e.timestamp < MAX_AGE_MS);
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "timestamp">): Promise<void> {
  const existing = await loadHistory(); // already pruned by loadHistory
  const newEntry: HistoryEntry = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...entry,
  };
  await saveHistory([newEntry, ...existing]);
}
