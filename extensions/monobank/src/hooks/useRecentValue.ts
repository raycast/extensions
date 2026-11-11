import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValueState] = useState<T>();

  useEffect(() => {
    let isCancelled = false;

    LocalStorage.getItem<string>(key)
      .then((json) => {
        if (isCancelled) return;
        const stored = parse(json, isValue);
        if (!stored) return;

        const now = Date.now();
        if (now - stored.usedAt >= ttl) return;

        setValueState(stored.value);
        save(key, stored.value, now);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // `isValue` is left out: the value is only read on launch, so a new validator wouldn't change anything.
  }, [key, ttl]);

  function setValue(value: T) {
    setValueState(value);
    save(key, value, Date.now());
  }

  return { value, setValue, isLoading };
}

function save<T>(key: string, value: T, usedAt: number) {
  LocalStorage.setItem(key, JSON.stringify({ value, usedAt } satisfies StoredValue<T>));
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
