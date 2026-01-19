import { useEffect, useRef, useState } from "react";
import { CacheManager } from "./cache-manager";

export const usePersistentState = <T>(key: string, initialValue: T) => {
  const cacheManager = useRef<CacheManager>(new CacheManager());

  const [state, setState] = useState<T>(() => {
    const cachedValue = cacheManager.current.get<T>(key);
    return cachedValue || initialValue;
  });

  useEffect(() => {
    cacheManager.current.set(key, state);
  }, [key, state]);

  return [state, setState] as const;
};
