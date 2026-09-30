import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export default function useLocalStorage<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const value = await LocalStorage.getItem<string>(key);
        if (value) {
          setData(JSON.parse(value));
        }
      } catch (error) {
        console.error(`Error loading from LocalStorage: ${error}`);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [key]);

  const setLocalStorageData = async (value: T) => {
    try {
      await LocalStorage.setItem(key, JSON.stringify(value));
      setData(value);
    } catch (error) {
      console.error(`Error saving to LocalStorage: ${error}`);
    }
  };

  return { data, setData: setLocalStorageData, isLoading };
}
