import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string) {
  const [state, setState] = useState<T>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setItem = (value: T) => {
    LocalStorage.setItem(key, JSON.stringify(value));
    setState(value);
  };

  useEffect(() => {
    LocalStorage.getItem(key).then((item) => {
      setState(item && JSON.parse(item.toString()));
      setIsLoading(false);
    });
  }, []);

  return { data: state, set: setItem, isLoading };
}
