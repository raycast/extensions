import { LocalStorage } from "@raycast/api";

/** How long after a write to check that another command's concurrent write didn't undo it. */
const VERIFY_DELAY_MS = 500;
const VERIFY_ATTEMPTS = 2;

/**
 * A JSON array in LocalStorage. Writes are chained so two updates landing
 * together can't drop each other's change. The chain is per command, though
 * (each command runs its own copy of this module), and LocalStorage has no
 * lock, so a write can pass `applied`: it's checked a moment later and
 * re-applied if another command's concurrent write replaced it.
 */
export function jsonStore<T>(key: string, parse: (raw: string | undefined) => T[]) {
  let chain: Promise<unknown> = Promise.resolve();

  async function load(): Promise<T[]> {
    await chain;
    return parse(await LocalStorage.getItem<string>(key));
  }

  function mutate(
    change: (list: T[]) => T[],
    applied?: (list: T[]) => boolean | Promise<boolean>,
    attempts = VERIFY_ATTEMPTS,
  ): Promise<T[]> {
    const written = chain.then(async () => {
      const list = change(parse(await LocalStorage.getItem<string>(key)));
      await LocalStorage.setItem(key, JSON.stringify(list));
      return list;
    });
    chain = written.catch(() => undefined);
    if (applied && attempts > 0) {
      // In the background, so the UI updates right away.
      void written
        .then(() => new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS)))
        .then(async () => {
          if (!(await applied(await load()))) await mutate(change, applied, attempts - 1);
        })
        .catch(() => undefined);
    }
    return written;
  }

  return { load, mutate };
}
