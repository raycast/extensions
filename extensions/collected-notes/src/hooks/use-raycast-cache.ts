import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";

export function useRaycastCache<T = string>(key: string) {
  const cache = new Cache();
  const [value, setInternalValue] = useState<T>();

  function getValue() {
    const cachedValue = cache.get(key);
    if (!cachedValue) return;
    const parsed = JSON.parse(cachedValue) as T;
    setInternalValue(parsed);
    return parsed;
  }

  function setValue(value: T) {
    setInternalValue(value);
    cache.set(key, JSON.stringify(value));
  }

  useEffect(() => {
    getValue();
  }, []);

  return [value, setValue, cache.clear] as const;
}
