import { LocalStorage } from "@raycast/api";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

type Fn = (...args: unknown[]) => unknown;

export const useInterval = (callback: Fn, delay?: number | null) => {
  const savedCallback = useRef<Fn>(() => null);

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [delay]);
};

export function useStateFromLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await LocalStorage.getItem(key);

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
      LocalStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return [state, setStateAndLocalStorage, loading];
}
