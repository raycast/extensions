import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export function useStorageState<T>(key: string, initial_value: T) {
  const [value, _setValue] = useState<T>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    LocalStorage.getItem(key).then((value) => {
      const actual = JSON.parse(value?.toString() ?? "null");
      if (actual != undefined) {
        _setValue(actual);
        setLoading(false);
        return;
      }
      try {
        LocalStorage.setItem(key, JSON.stringify(initial_value));
      } catch {
        /* empty */
      }
      _setValue(initial_value);
      setLoading(false);
    });
  }, [key, initial_value]);
  const setValue: typeof _setValue = (new_value) => {
    const actual_value = new_value instanceof Function ? new_value(value) : new_value;
    LocalStorage.setItem(key, JSON.stringify(actual_value));
    _setValue(actual_value);
  };
  return [value, setValue, { loading }] as const;
}
