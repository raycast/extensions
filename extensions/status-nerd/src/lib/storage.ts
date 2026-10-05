import { LocalStorage } from "@raycast/api";

/** A status the user can pick or store. `gitlab_emoji` is optional (only the defaults carry it). */
export interface StoredStatus {
  emoji: string;
  text: string;
  gitlab_emoji?: string;
}

const SAVED_KEY = "saved-statuses";
const RECENT_KEY = "recent-statuses";
const RECENT_MAX = 8;

const sameStatus = (a: StoredStatus, b: StoredStatus) =>
  a.emoji === b.emoji && a.text === b.text;

async function read(key: string): Promise<StoredStatus[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredStatus[]) : [];
  } catch {
    return [];
  }
}

async function write(key: string, items: StoredStatus[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(items));
}

export const getSaved = () => read(SAVED_KEY);
export const getRecent = () => read(RECENT_KEY);

/** Add a status to the saved list (deduped, newest first). */
export async function addSaved(item: StoredStatus): Promise<void> {
  const items = await getSaved();
  if (items.some((i) => sameStatus(i, item))) return;
  await write(SAVED_KEY, [item, ...items]);
}

export async function removeSaved(item: StoredStatus): Promise<void> {
  const items = await getSaved();
  await write(
    SAVED_KEY,
    items.filter((i) => !sameStatus(i, item)),
  );
}

/** Record a status as recently used (deduped to the front, capped). */
export async function addRecent(item: StoredStatus): Promise<void> {
  const items = await getRecent();
  const next = [item, ...items.filter((i) => !sameStatus(i, item))];
  await write(RECENT_KEY, next.slice(0, RECENT_MAX));
}

export async function removeRecent(item: StoredStatus): Promise<void> {
  const items = await getRecent();
  await write(
    RECENT_KEY,
    items.filter((i) => !sameStatus(i, item)),
  );
}
