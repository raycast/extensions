import { Cache } from "@raycast/api";

const cache = new Cache();

export const DAY_MS = 24 * 60 * 60 * 1000;

type Entry<T> = { at: number; value: T };

export const cached = async <T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> => {
  const stored = cache.get(key);
  if (stored) {
    try {
      const entry = JSON.parse(stored) as Entry<T>;
      if (Date.now() - entry.at < ttl) return entry.value;
    } catch {
      // A cache written by an older shape is worth less than the request it saves.
    }
  }

  const value = await load();
  cache.set(key, JSON.stringify({ at: Date.now(), value } satisfies Entry<T>));
  return value;
};
