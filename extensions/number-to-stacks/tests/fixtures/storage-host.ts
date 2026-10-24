import { useState } from "react";

export const storage = new Map<string, unknown>();
export const storageState = { loading: false, writes: 0 };

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T | undefined>(() =>
    storageState.loading
      ? undefined
      : ((storage.get(key) as T | undefined) ?? initialValue),
  );
  return {
    value,
    isLoading: storageState.loading,
    async setValue(nextValue: T) {
      storageState.writes += 1;
      storage.set(key, nextValue);
      setValue(nextValue);
    },
  };
}
