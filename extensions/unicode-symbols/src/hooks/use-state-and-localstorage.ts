import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

/**
 * Use state and local storage
 * @param key The key to use for the local storage
 * @param initialValue The initial value to use
 * @returns The state and the local storage
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useStateAndLocalStorage = <T, _ = void>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] => {
  const [state, setState] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await LocalStorage.getItem(key);

      if (typeof cache === "string") {
        if (!didUnmount) {
          setState(JSON.parse(cache));
          setReady(true);
        }
      } else {
        if (!didUnmount) {
          setReady(true);
        }
      }
    })();

    return () => {
      didUnmount = true;
    };
  }, []);

  // @ts-expect-error TS struggles to infer the types as T could potentially be a function
  const setStateAndLocalStorage = useCallback((updater) => {
    setState((state) => {
      const newValue = typeof updater === "function" ? updater(state) : updater;
      LocalStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return [state, setStateAndLocalStorage, ready];
};
