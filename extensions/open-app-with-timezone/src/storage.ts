import { LocalStorage } from "@raycast/api";

let queue: Promise<unknown> = Promise.resolve();

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const item = await LocalStorage.getItem<string>(key);
  return item === undefined ? fallback : (JSON.parse(item) as T);
}

/** Read-modify-write against the latest stored value; writes are serialized so none is lost. */
export function updateJSON<T>(key: string, fallback: T, update: (value: T) => T): Promise<T> {
  const result = queue.then(async () => {
    const next = update(await readJSON(key, fallback));
    await LocalStorage.setItem(key, JSON.stringify(next));
    return next;
  });
  queue = result.catch(() => undefined);
  return result;
}
