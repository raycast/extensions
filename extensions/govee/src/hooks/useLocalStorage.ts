import { useEffect, useState } from "react";

import { LocalStorage } from "@raycast/api";

const useLocalStorage = <T>(key: string, initialValue?: T) => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(initialValue || ({} as T));

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
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    setLocalStorageValue(data);
  }, [data]);

  async function setLocalStorageValue(newValue: T) {
    await LocalStorage.setItem(key, JSON.stringify(newValue));
  }

  async function getLocalStorageValue() {
    const data = await LocalStorage.getItem<string>(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async function revalidate() {
    setIsLoading(true);
    const value = await getLocalStorageValue();
    if (value !== null) {
      setData(value);
    }
    setIsLoading(false);
  }

  async function getRaw() {
    return await LocalStorage.getItem<string>(key);
  }

  async function setRaw(input: string) {
    await LocalStorage.setItem(key, input);
  }

  async function clear() {
    await LocalStorage.removeItem(key);
    setData(initialValue || ({} as T));
  }

  return {
    data,
    setData,
    isLoading,
    revalidate,
    getRaw,
    setRaw,
    clear,
  };
};

export default useLocalStorage;
