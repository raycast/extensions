import type { Gear } from "./catalog";

export const RECENTS_LIMIT = 10;

export function rememberGear(recents: Gear[], gear: Gear): Gear[] {
  return [gear, ...recents.filter((item) => item.slug !== gear.slug)].slice(0, RECENTS_LIMIT);
}

/** Serialize updates and read persisted history inside each transaction. */
export function createRecentHistory(read: () => Promise<Gear[]>, write: (items: Gear[]) => Promise<void>) {
  let initialRead: Promise<Gear[]> | undefined;
  let pending: Promise<unknown> = Promise.resolve();
  function load() {
    initialRead ??= read().catch((error: unknown) => {
      initialRead = undefined;
      throw error;
    });
    return initialRead;
  }
  function record(gear: Gear): Promise<Gear[]> {
    const update = pending.then(async () => {
      await load();
      const latest = await read();
      const next = rememberGear(latest, gear);
      await write(next);
      initialRead = Promise.resolve(next);
      return next;
    });
    pending = update.catch(() => undefined);
    return update;
  }
  return { load, record };
}
