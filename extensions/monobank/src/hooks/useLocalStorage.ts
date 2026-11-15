import { LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { PERSONAL_STORAGE_KEYS } from "../data/constants";
import { purgeListeners } from "../services/owner";

/**
 * React state mirrored to LocalStorage as JSON under `key`. A personal key (see `PERSONAL_STORAGE_KEYS`) goes back
 * to `initialValue` when the previous person's data is removed.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<T>(initialValue);
  const initial = useRef(initialValue);
  initial.current = initialValue;

  useEffect(() => {
    let isCancelled = false;

    LocalStorage.getItem<string>(key)
      .then((json) => {
        if (!isCancelled && json) setData(JSON.parse(json) as T);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!(PERSONAL_STORAGE_KEYS as readonly string[]).includes(key)) return;
    const listener = () => setData(initial.current);
    purgeListeners.add(listener);
    return () => {
      purgeListeners.delete(listener);
    };
  }, [key]);

  // Persist only after the stored value has been read, so it is never overwritten by `initialValue`.
  useEffect(() => {
    if (isLoading) return;
    LocalStorage.setItem(key, JSON.stringify(data));
  }, [key, data, isLoading]);

  return { data, setData, isLoading };
}
