import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

const ttl = 60 * 60; // 1 hour // todo: make this configurable, maybe even per cache key / api call

type Cache<S> = {
  lastUpdate: number;
  data: S;
};

// generic cached state implementation
// receives a cache key, the initial value and a data loader function which will be used to refresh
// the state in the background and update the cache with the new data
export function useLocalState<S>(key: string, initialValue: S, dataLoader: () => Promise<S>): [S, boolean] {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<S>(initialValue);

  useEffect(() => {
    (async () => {
      let cache = {} as Cache<S>;
      const dump = await LocalStorage.getItem(key);

      if (typeof dump === "string") {
        cache = JSON.parse(dump) as Cache<S>;
        setState(cache.data);
        setLoading(false);
      }

      if (cache?.lastUpdate > Date.now() - ttl * 1000) {
        return;
      }

      dataLoader()
        .then(data => {
          LocalStorage.setItem(key, JSON.stringify({ lastUpdate: Date.now(), data: data } as Cache<S>));

          setState(data);
          setLoading(false);
        })
        .catch(e => {
          showToast(Toast.Style.Failure, e.message);
        });
    })();
  }, []);

  return [state, loading];
}

// clears the specific cache key and displays a toast with the outcome
export function clearLocalState(key: string) {
  LocalStorage.removeItem(key)
    .then(() => {
      showToast(Toast.Style.Success, `Cleared ${key} cache`);
    })
    .catch(() => {
      showToast(Toast.Style.Failure, `Failed to clear ${key} cache`);
    });
}
