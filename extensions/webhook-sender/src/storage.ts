import { LocalStorage } from "@raycast/api";
import { HistoryEntry, SavedWebhook } from "./types";

const HISTORY_KEY = "webhook_history";
const SAVED_KEY = "webhook_saved";
const MAX_HISTORY = 50;

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

// History writes are read-modify-write, so run them one at a time to avoid lost updates.
let historyQueue: Promise<unknown> = Promise.resolve();

function enqueueHistoryWrite(task: () => Promise<void>): Promise<void> {
  const run = historyQueue.then(task);
  historyQueue = run.catch(() => undefined);
  return run;
}

export function addHistory(entry: HistoryEntry): Promise<void> {
  return enqueueHistoryWrite(async () => {
    const history = await getHistory();
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  });
}

export function deleteHistory(id: string): Promise<void> {
  return enqueueHistoryWrite(async () => {
    const history = await getHistory();
    const updated = history.filter((h) => h.id !== id);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  });
}

export function clearHistory(): Promise<void> {
  return enqueueHistoryWrite(async () => {
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  });
}

export async function getSaved(): Promise<SavedWebhook[]> {
  const raw = await LocalStorage.getItem<string>(SAVED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedWebhook[];
  } catch {
    return [];
  }
}

export async function saveWebhook(webhook: SavedWebhook): Promise<void> {
  const saved = await getSaved();
  const existing = saved.find((s) => s.id === webhook.id) ?? null;
  const entry: SavedWebhook = existing ? { ...webhook, createdAt: existing.createdAt } : webhook;
  const updated = existing ? saved.map((s) => (s.id === entry.id ? entry : s)) : [entry, ...saved];
  await LocalStorage.setItem(SAVED_KEY, JSON.stringify(updated));
}

export async function deleteSaved(id: string): Promise<void> {
  const saved = await getSaved();
  const updated = saved.filter((s) => s.id !== id);
  await LocalStorage.setItem(SAVED_KEY, JSON.stringify(updated));
}
