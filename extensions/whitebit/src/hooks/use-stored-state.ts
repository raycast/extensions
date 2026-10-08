import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

export function useStoredState<T>(key: string, defaultValue: T | undefined) {
  const [state, _setState] = useState<T | undefined>(defaultValue);

  useEffect(() => {
    LocalStorage.getItem<string>(key).then((result) => {
      try {
        _setState(JSON.parse(result || ""));
      } catch (e) {
        _setState(defaultValue);
      }
    });
  }, []);

  async function setState(value: T) {
    await LocalStorage.setItem(key, JSON.stringify(value));

    _setState(value);
  }

  return [state, setState] as [T, typeof setState];
}
