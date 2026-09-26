import { Cache, LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

type Updater<T> = T | ((prev: T) => T);

/** Same store `useCachedState` reads (root namespace), used only to tell "evicted" from "present". */
const cache = new Cache();

/**
 * Synchronous state that survives cache eviction.
 *
 * `useCachedState` gives an instant first paint and keeps every command in
 * sync, but Raycast's Cache is an LRU that can be cleared, which would send
 * the user back through onboarding with their locations gone. LocalStorage is
 * durable but async. This keeps both: the cache is the read path, LocalStorage
 * is written through on every change and restored into the cache on mount.
 *
 * The cache is authoritative whenever it holds the key: it is written
 * synchronously on every change, so it is always at least as new as the
 * backup. The backup is only read back after an eviction. Restoring
 * unconditionally would let a command that mounts mid-write (the menu bar is
 * relaunched right after every settings change) read a stale LocalStorage
 * value and push it into the shared cache, reverting the change everywhere.
 *
 * `isValid` guards against corrupted or foreign values from either store; an
 * invalid value falls back to `initial` instead of crashing the view.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (v: unknown) => v is T,
): [T, (next: Updater<T>) => void, boolean] {
  const [cached, setCached] = useCachedState<T>(key, initial);
  // With the key in the cache there is nothing to wait for.
  const [hydrated, setHydrated] = useState(() => cache.has(key));
  const value = isValid(cached) ? cached : initial;

  const latest = useRef(value);
  latest.current = value;
  // A change made before the LocalStorage read resolves must win over it.
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    LocalStorage.getItem<string>(key)
      .then((raw) => {
        if (cancelled || dirty.current) return;
        const serialized = cache.get(key);
        if (serialized !== undefined) {
          // Cache is current. Seed the backup if this key predates it (existing users).
          if (raw === undefined) LocalStorage.setItem(key, serialized).catch(() => {});
          return;
        }
        if (raw === undefined) return;
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) setCached(parsed);
      })
      .catch(() => {
        // Unreadable backup: keep whatever the cache has.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const set = (next: Updater<T>) => {
    const resolved = typeof next === "function" ? (next as (prev: T) => T)(latest.current) : next;
    dirty.current = true;
    latest.current = resolved;
    setCached(resolved);
    LocalStorage.setItem(key, JSON.stringify(resolved)).catch(() => {
      // The cache still has the value; the backup just misses this write.
    });
  };

  return [value, set, hydrated];
}
