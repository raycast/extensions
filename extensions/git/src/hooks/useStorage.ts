import { Cache, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Dispatch, SetStateAction, useCallback, useRef } from "react";

/** Root Cache instance used by `useCachedState` without a namespace. */
const rootCache = new Cache();

/**
 * Persistent storage hook backed by LocalStorage, with a one-time migration from Cache API.
 *
 * Mirrors `useCachedState` ergonomics: always returns a defined `T` while loading or migrating
 * (`initialState`), then the stored value. Persists via LocalStorage.
 *
 * `useLocalStorage#setValue` does not reliably re-render; a separate `useCachedState` revision
 * counter (not the stored payload) is bumped on writes so all hook instances sharing the same
 * revision key re-render via Cache subscription.
 *
 * @param key - Unique storage key (same as former `useCachedState` key for migration).
 * @param initialState - Value used before storage is ready and when the key does not exist yet.
 * @returns Tuple of state and setter (same shape as `useCachedState`).
 */
export function useStorage<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {
  const { data, mutate } = useCachedPromise(
    async (cacheKey: string) => {
      const cachedRaw = rootCache.get(cacheKey);
      if (cachedRaw !== undefined) {
        console.warn(`Detected legacy cache for the key ${cacheKey}`);
        const parsed = JSON.parse(cachedRaw) as T;

        await LocalStorage.setItem(cacheKey, cachedRaw);
        rootCache.remove(cacheKey);
        console.warn(`Migrated legacy cache for the key ${cacheKey}.`);
        return parsed;
      }

      const rawValue = await LocalStorage.getItem<string>(cacheKey);
      if (rawValue === undefined) return initialState;

      return JSON.parse(rawValue) as T;
    },
    [key],
    {
      initialData: initialState,
    },
  );

  const dataRef = useRef(data);
  dataRef.current = data;

  const setValue = useCallback(
    async (updater: SetStateAction<T>) => {
      // @ts-expect-error TS struggles to infer the types as T could potentially be a function
      const nextValue = typeof updater === "function" ? updater(dataRef.current) : updater;
      try {
        await mutate(LocalStorage.setItem(key, JSON.stringify(nextValue)), {
          optimisticUpdate: () => nextValue,
          shouldRevalidateAfter: false,
        });
      } catch (error) {
        showFailureToast(error, { title: "Failed to update value in local storage" });
      }
    },
    [key, mutate],
  );

  return [data, setValue];
}
