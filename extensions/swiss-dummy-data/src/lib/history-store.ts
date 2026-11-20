import { addToHistory, HISTORY_KEYS } from "./history";

export interface Storage {
  getItem<T extends string>(key: string): Promise<T | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type HistoryStore = ReturnType<typeof createHistoryStore>;

export function createHistoryStore(storage: Storage) {
  let pending: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = pending.then(task);
    pending = result.catch(() => undefined);
    return result;
  }

  async function read(key: string): Promise<string[]> {
    const item = await storage.getItem<string>(key);
    return item ? JSON.parse(item) : [];
  }

  async function write(key: string, entries: string[]): Promise<string[]> {
    await storage.setItem(key, JSON.stringify(entries));
    return entries;
  }

  return {
    load: (key: string) => enqueue(() => read(key)),
    record: (key: string, value: string, size: number) =>
      enqueue(async () => write(key, addToHistory(await read(key), value, size))),
    remove: (key: string, value: string) =>
      enqueue(async () =>
        write(
          key,
          (await read(key)).filter((entry) => entry !== value),
        ),
      ),
    clear: (key: string, keep?: string) => enqueue(() => write(key, keep === undefined ? [] : [keep])),
    deleteAll: () =>
      enqueue(async () => {
        await Promise.all(Object.values(HISTORY_KEYS).map((key) => storage.removeItem(key)));
        return [] as string[];
      }),
    flush: () => enqueue(async () => undefined),
  };
}
