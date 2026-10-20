import { LocalStorage } from "@raycast/api";
import type { RecognizedTrack } from "./types";

const STORAGE_KEY = "recognition-history";
const MAX_ENTRIES = 200;

// LocalStorage offers no atomic update, so every write is a read-modify-write.
// Two of them overlapping would lose an entry - or let a recognition that was
// already in flight write back a list the user has just cleared. Chaining them
// keeps each one working on the list the previous one left behind.
let pending: Promise<unknown> = Promise.resolve();

function serialize<T>(mutate: () => Promise<T>): Promise<T> {
  // Both handlers are the same call on purpose: a failed mutation must not
  // block the ones queued behind it.
  const next = pending.then(mutate, mutate);
  pending = next.catch(() => undefined);
  return next;
}

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
  await serialize(async () => {
    const history = await getHistory();
    history.unshift(track);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
  });
}

export async function removeFromHistory(id: string): Promise<void> {
  await serialize(async () => {
    const history = await getHistory();
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history.filter((t) => t.id !== id)));
  });
}

export async function clearHistory(): Promise<void> {
  await serialize(() => LocalStorage.removeItem(STORAGE_KEY));
}
