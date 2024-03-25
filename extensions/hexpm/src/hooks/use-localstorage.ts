import { LocalStorage } from "@raycast/api";
import type { SetStateAction } from "react";
import { useEffect, useState, useCallback } from "react";

export function useLocalStorage<T = unknown>(props: { key: string; initialValue: T; namespace: string }) {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<T>(props.initialValue);
  const storageKey = `${props.namespace}@${props.key}`;

  useEffect(() => {
    let didUnmount = false;

    (async () => {
      const cache = await LocalStorage.getItem<string>(storageKey);
      if (didUnmount) {
        return;
      }
      if (cache !== undefined) {
        setData(JSON.parse(cache));
      }
      setLoading(false);
    })();

    return () => {
      didUnmount = true;
    };
  }, []);

  function onSetItem(updater: SetStateAction<T>) {
    setData((prevState) => {
      // @ts-expect-error - TS doesn't understand that updater can be a function
      const state = typeof updater === "function" ? updater(prevState) : updater;
      LocalStorage.setItem(storageKey, JSON.stringify(state));
      return state;
    });
  }

  const onRemoveItem = useCallback(async () => {
    await LocalStorage.removeItem(props.key);
    setData(props.initialValue);
  }, [props.initialValue, setData]);

  return {
    data,
    isLoading,
    onSetItem,
    onRemoveItem,
  };
}
