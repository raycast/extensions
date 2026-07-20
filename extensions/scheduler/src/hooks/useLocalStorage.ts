import { useState, useEffect, useCallback } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  const loadValue = useCallback(async () => {
    try {
      setIsLoading(true);
      const item = await LocalStorage.getItem<string>(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error loading from LocalStorage key "${key}":`, error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Data",
        message: `Failed to load data for key: ${key}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        await LocalStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error saving to LocalStorage key "${key}":`, error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error Saving Data",
          message: `Failed to save data for key: ${key}`,
        });
      }
    },
    [key, storedValue],
  );

  useEffect(() => {
    loadValue();
  }, [loadValue]);

  return [storedValue, setValue, isLoading] as const;
}
