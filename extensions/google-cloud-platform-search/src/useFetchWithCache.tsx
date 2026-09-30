import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export function useFetchWithCache<S>(cacheKey: string, fetcher: () => Promise<S>) {
  const [state, setState] = useState<{
    data?: S;
    error?: Error;
    isLoading: boolean;
    failureMessage: boolean;
  }>({ isLoading: true, failureMessage: false });
  useEffect(() => {
    (async () => {
      const cacheData = await LocalStorage.getItem(cacheKey);
      if (cacheData) {
        setState((oldState) => ({ ...oldState, data: JSON.parse(cacheData as string) }));
      }

      try {
        const newData = await fetcher();
        setState((oldState) => ({ ...oldState, data: newData }));
        await LocalStorage.setItem(cacheKey, JSON.stringify(newData));
      } catch (e) {
        setState((oldState) => ({ ...oldState, error: e as Error }));
        if (!cacheData) {
          setState((oldState) => ({ ...oldState, failureMessage: true }));
        }
      } finally {
        setState((oldState) => ({ ...oldState, isLoading: false }));
      }
    })();
  }, [fetcher]);
  return { ...state };
}
