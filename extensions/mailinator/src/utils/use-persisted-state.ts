import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

export const usePersistedState = <T extends LocalStorage.Value>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<T>(key).then((value) => {
      setState(value ?? initialValue);
      setIsLoading(false);
    });
  }, []);

  const setStateAndPersist = useCallback((newValue: T) => {
    setState(newValue);
    LocalStorage.setItem(key, newValue);
  }, []);

  return [state, setStateAndPersist, isLoading] as const;
};
