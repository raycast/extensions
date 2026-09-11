import { LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

export default function useLocalStorage<T>(key: string, initialValue?: T) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(initialValue || ({} as T));
  const hasLoaded = useRef(false);

  useEffect(() => {
    setIsLoading(true);
    getLocalStorageValue()
      .then((json) => {
        if (!json && initialValue) {
          setLocalStorageValue(initialValue);
          setData(initialValue);
          return;
        }

        setData(json as T);
      })
      .finally(() => {
        hasLoaded.current = true;
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // Don't persist until the stored value has been read, otherwise the initial
    // value would overwrite a previously saved value on mount.
    if (!hasLoaded.current) {
      return;
    }

    setLocalStorageValue(data);
  }, [data]);

  async function setLocalStorageValue(newValue: T) {
    await LocalStorage.setItem(key, JSON.stringify(newValue));
  }

  async function getLocalStorageValue() {
    const data = await LocalStorage.getItem<string>(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  return {
    data,
    setData,
    isLoading,
  };
}
