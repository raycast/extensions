import { LocalStorage, getPreferenceValues } from "@raycast/api";

const STORAGE_KEY = "history";
const CYCLE_STATE_KEY = "cycleState";

interface Preferences {
  maxItems: string;
  pollInterval: string;
}

type Entry = { text: string; timestamp: number };

let history: Entry[] = [];

function getMaxItems(): number {
  const prefs = getPreferenceValues<Preferences>();
  return Number(prefs.maxItems) || 50;
}

export async function loadHistory(): Promise<void> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  history = raw ? (JSON.parse(raw) as Entry[]) : [];
}

export async function saveHistory(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function add(text: string): void {
  if (!text.trim()) return;
  // dedupe against head
  if (history[0]?.text === text) return;
  history.unshift({ text, timestamp: Date.now() });
  const maxItems = getMaxItems();
  if (history.length > maxItems) history.pop();
  saveHistory();
}

export function get(index: number): string | undefined {
  return history[index]?.text;
}

export function list(): Entry[] {
  return [...history];
}

// Cycle state management
interface CycleState {
  position: number;
  timestamp: number;
}

export async function getCycleState(): Promise<CycleState> {
  const raw = await LocalStorage.getItem<string>(CYCLE_STATE_KEY);
  if (raw) {
    return JSON.parse(raw) as CycleState;
  }
  return { position: 0, timestamp: 0 };
}

export async function setCycleState(
  position: number,
  timestamp: number,
): Promise<void> {
  await LocalStorage.setItem(
    CYCLE_STATE_KEY,
    JSON.stringify({ position, timestamp }),
  );
}
