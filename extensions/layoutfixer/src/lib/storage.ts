import { LocalStorage } from "@raycast/api";

const DICTIONARY_KEY = "personal-dictionary";
const HISTORY_KEY = "history";
const HISTORY_LIMIT = 100;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// MARK: - Personal dictionary

export async function getPersonalWords(): Promise<string[]> {
  return readJSON<string[]>(DICTIONARY_KEY, []);
}

export async function addPersonalWord(word: string): Promise<void> {
  const words = await getPersonalWords();
  const w = word.trim();
  if (!w || words.includes(w)) return;
  await LocalStorage.setItem(DICTIONARY_KEY, JSON.stringify([...words, w].sort((a, b) => a.localeCompare(b))));
}

export async function removePersonalWord(word: string): Promise<void> {
  const words = await getPersonalWords();
  await LocalStorage.setItem(DICTIONARY_KEY, JSON.stringify(words.filter((w) => w !== word)));
}

// MARK: - History

export type HistoryKind = "layout" | "spelling" | "cleanup" | "finglish" | "ai";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  original: string;
  fixed: string;
  date: number;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return readJSON<HistoryEntry[]>(HISTORY_KEY, []);
}

export async function addHistory(kind: HistoryKind, original: string, fixed: string): Promise<void> {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    original,
    fixed,
    date: Date.now(),
  };
  const history = await getHistory();
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, HISTORY_LIMIT)));
}

export async function removeHistory(id: string): Promise<void> {
  const history = await getHistory();
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter((e) => e.id !== id)));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

// MARK: - Last fix, for Undo

const LAST_FIX_KEY = "last-fix";

export interface LastFix {
  original: string;
  fixed: string;
  date: number;
  /** The keyboard layout before the fix, to switch back to. */
  previousLang: "en" | "fa" | null;
  /** Whether the fix switched the layout. */
  switched: boolean;
  /** Bundle id of the app that received the edit. Undo only sends ⌘Z there. */
  app: string | null;
}

export async function getLastFix(): Promise<LastFix | null> {
  return readJSON<LastFix | null>(LAST_FIX_KEY, null);
}

export async function setLastFix(fix: LastFix): Promise<void> {
  await LocalStorage.setItem(LAST_FIX_KEY, JSON.stringify(fix));
}

export async function clearLastFix(): Promise<void> {
  await LocalStorage.removeItem(LAST_FIX_KEY);
}

// MARK: - Onboarding

const SETUP_SEEN_KEY = "setup-seen";

export async function hasSeenSetup(): Promise<boolean> {
  return (await LocalStorage.getItem<string>(SETUP_SEEN_KEY)) === "1";
}

export async function markSetupSeen(): Promise<void> {
  await LocalStorage.setItem(SETUP_SEEN_KEY, "1");
}

export async function resetSetupSeen(): Promise<void> {
  await LocalStorage.removeItem(SETUP_SEEN_KEY);
}
