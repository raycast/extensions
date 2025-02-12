import { LocalStorage } from "@raycast/api";
import { useCallback } from "react";

export type AsyncReturnType<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: unknown[]
) => Promise<infer R>
  ? R
  : unknown;

export interface Cache<T> {
  /** Date updated */
  uat: number;

  /** Actual data */
  dat: T;
}

const keyForCache = (key: string) => `useCache:${key}`;

export async function invalidate(cacheKey: string) {
  const innerCacheKey = keyForCache(cacheKey);

  await LocalStorage.removeItem(innerCacheKey);
}

export function useCache<F extends (...args: unknown[]) => Promise<AsyncReturnType<F>>>(
  fetcher: F,
  cacheKey: string,
  cacheMs: number
): (...args: Parameters<F>) => Promise<AsyncReturnType<F>> {
  return useCallback(async (...args: Parameters<F>) => {
    const innerCacheKey = keyForCache(cacheKey);
    const hit = await LocalStorage.getItem<string>(innerCacheKey);

    if (hit) {
      const entry = JSON.parse(hit) as Cache<AsyncReturnType<F>>;

      if (Date.now() - entry.uat < cacheMs) {
        return entry.dat;
      }
    }

    const result = await fetcher(...args);

    await LocalStorage.setItem(innerCacheKey, JSON.stringify({ uat: Date.now(), dat: result }));

    return result;
  }, []);
}
