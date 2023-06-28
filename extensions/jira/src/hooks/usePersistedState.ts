import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Dispatch, SetStateAction, useEffect } from "react";

export default function usePersistedState(key: string, defaultValue: string): [string, Dispatch<SetStateAction<string>>] {
  const [state, setState] = useCachedState<string>(key, defaultValue)
  useEffect(() => {
    const getStoredValue = async () => {
      const storedValue = await LocalStorage.getItem<string>(key);
      if(storedValue) {
        setState(storedValue);
      }
    } 
    getStoredValue();
  }, [])
  useEffect(() => {
    if(state) {
      LocalStorage.setItem(key, state)
    }
  },[state])
  return [state, setState];
}
