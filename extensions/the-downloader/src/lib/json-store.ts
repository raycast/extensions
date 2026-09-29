import { LocalStorage } from "@raycast/api";

/**
 * A JSON array in LocalStorage with serialized read-modify-write, so two
 * updates landing together (two downloads finishing, two chats saving) can't
 * drop each other's change.
 */
export function jsonStore<T>(key: string, parse: (raw: string | undefined) => T[]) {
  let chain: Promise<unknown> = Promise.resolve();
  return {
    async load(): Promise<T[]> {
      await chain;
      return parse(await LocalStorage.getItem<string>(key));
    },
    mutate(change: (list: T[]) => T[]): Promise<T[]> {
      const next = chain.then(async () => {
        const list = change(parse(await LocalStorage.getItem<string>(key)));
        await LocalStorage.setItem(key, JSON.stringify(list));
        return list;
      });
      chain = next.catch(() => undefined);
      return next;
    },
  };
}
