import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";

interface StoredValue<T> {
  value: T;
  usedAt: number;
}

/**
 * A value saved in LocalStorage under `key` that is only restored if it was used within `ttl`.
 * Reading it on launch counts as a use, so each launch restarts the timer. Expiry is checked once,
 * on launch, so the value never changes while the command stays open.
 * `value` is `undefined` when nothing recent is saved, or the saved value fails `isValue`.
 */
export function useRecentValue<T>(key: string, ttl: number, isValue: (value: unknown) => value is T) {
  const { data, isLoading, mutate } = usePromise(
    async (key: string, ttl: number): Promise<T | undefined> => {
      const stored = parse(await LocalStorage.getItem<string>(key), isValue);
      const now = Date.now();
      if (!stored || now - stored.usedAt >= ttl) return undefined;

      await save(key, stored.value, now);
      return stored.value;
    },
    [key, ttl],
    { failureToastOptions: { title: "Failed to load the last selection" } },
  );

  const setValue = useCallback(
    (value: T) => {
      // Not read again after saving: the expiry is only checked on launch.
      mutate(save(key, value, Date.now()), {
        optimisticUpdate: () => value as Awaited<T>,
        shouldRevalidateAfter: false,
      }).catch(console.error);
    },
    [key, mutate],
  );

  // A value set before the first read finished cancels that read, so it counts as loaded.
  return { value: data, setValue, isLoading: isLoading && data === undefined };
}

function save<T>(key: string, value: T, usedAt: number) {
  return LocalStorage.setItem(key, JSON.stringify({ value, usedAt } satisfies StoredValue<T>));
}

/** The stored value, or undefined if there is none or it has another shape. */
function parse<T>(json: string | undefined, isValue: (value: unknown) => value is T): StoredValue<T> | undefined {
  if (!json) return undefined;
  try {
    const stored: unknown = JSON.parse(json);
    if (
      typeof stored === "object" &&
      stored !== null &&
      typeof (stored as StoredValue<unknown>).usedAt === "number" &&
      isValue((stored as StoredValue<unknown>).value)
    ) {
      return stored as StoredValue<T>;
    }
  } catch {
    // Not JSON: treated as nothing saved.
  }
  return undefined;
}
