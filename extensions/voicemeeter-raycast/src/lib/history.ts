import { readJson, writeJson } from "./storage";
import { HistoryEntry } from "./types";

const HISTORY_KEY = "vm.history.v1";
const HISTORY_LIMIT = 10;

async function load(): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(HISTORY_KEY, []);
}

async function save(entries: HistoryEntry[]): Promise<void> {
  await writeJson(HISTORY_KEY, entries);
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const current = await load();
  const next = [entry, ...current].slice(0, HISTORY_LIMIT);
  await save(next);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const entries = await load();
  const now = Date.now();
  const filtered = entries.filter((item) => item.expiresAt > now);
  if (filtered.length !== entries.length) {
    await save(filtered);
  }
  return filtered;
}

export async function popUndoEntry(): Promise<HistoryEntry | undefined> {
  const entries = await getHistory();
  if (entries.length === 0) {
    return undefined;
  }
  const [head, ...tail] = entries;
  await save(tail);
  return head;
}
