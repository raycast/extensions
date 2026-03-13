import type { Dispatch, SetStateAction } from "react";

import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

const useLocalStorageLocal = <T>(key: string, initialValue?: T) => {
  const { value, setValue, isLoading } = useLocalStorage<T>(key, initialValue);

  const setData: Dispatch<SetStateAction<T>> = (newValue) => {
    const oldValue = value;
    if (typeof oldValue === "undefined") {
      return;
    }
    const setNewVal = typeof newValue === "function" ? (newValue as (prev: T) => T)(oldValue) : newValue;
    setValue(setNewVal);
  };

  async function clear() {
    await LocalStorage.removeItem(key);
    setData(initialValue || ({} as T));
  }

  return {
    data: value,
    setData,
    isLoading,
    clear,
  };
};

export default useLocalStorageLocal;
