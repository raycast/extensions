import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";

export function useStateFromLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await getLocalStorageItem(key);

      if (typeof cache === "string") {
        if (!didUnmount) {
          setState(JSON.parse(cache));
        }
      }
      setLoading(false);
    })();

    return () => {
      didUnmount = true;
    };
  }, []);

  const setStateAndLocalStorage = useCallback((updater) => {
    setState((state) => {
      const newValue = typeof updater === "function" ? updater(state) : updater;
      setLocalStorageItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return [state, setStateAndLocalStorage, loading];
}
