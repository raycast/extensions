import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

/** React state mirrored to LocalStorage as JSON under `key`. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<T>(initialValue);

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

  // Persist only after the stored value has been read, so it is never overwritten by `initialValue`.
  useEffect(() => {
    if (isLoading) return;
    LocalStorage.setItem(key, JSON.stringify(data));
  }, [key, data, isLoading]);

  return { data, setData, isLoading };
}
