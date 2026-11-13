import { LocalStorage } from "@raycast/api";

/**
 * Actions fire storage writes without awaiting them, and a React hook's copy of
 * the list is the one from its last render, so two quick actions would write
 * from the same stale array. Updates queue here and read what is stored.
 */
let queue: Promise<unknown> = Promise.resolve();

export async function updateIds(key: string, update: (ids: string[]) => string[]): Promise<string[]> {
  const next = queue.then(async () => {
    const stored = await LocalStorage.getItem<string>(key);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    const updated = update(ids);
    await LocalStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
  queue = next.catch(() => undefined);
  return next;
}
