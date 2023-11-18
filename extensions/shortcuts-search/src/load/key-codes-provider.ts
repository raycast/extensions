import { useFetch, usePromise } from "@raycast/utils";
import { useState } from "react";
import { CacheManager } from "../cache/cache-manager";

export type KeyCodes = Map<string, string>;

interface IncomingKeyCodes {
  keyCodes: [string, string][];
}

const cacheManager = new CacheManager();
const CACHE_KEY = "key-codes";

export default function useKeyCodes() {
  const [keyCodes, setKeyCodes] = useState<Map<string, string> | undefined>();
  const [shouldUpdateCache, setShouldUpdateCache] = useState(false);

  usePromise(async () => cacheManager.getCachedItem<IncomingKeyCodes>(CACHE_KEY), [], {
    onData: async (cachedItem) => {
      if (cacheManager.cacheItemIsValid(cachedItem)) {
        if (!cachedItem) return;
        setKeyCodes(new Map(cachedItem.data.keyCodes));
      } else {
        setShouldUpdateCache(true);
      }
    },
  });

  useFetch<IncomingKeyCodes>("https://shortcuts.solomk.in/data/key-codes.json", {
    keepPreviousData: true,
    execute: shouldUpdateCache,
    onData: async (fetchedData) => {
      console.log("Received key codes");
      setKeyCodes(new Map(fetchedData.keyCodes));
      await cacheManager.setValueWithTtl(CACHE_KEY, fetchedData);
    },
  });

  return {
    isLoading: keyCodes === undefined,
    data: keyCodes,
  };
}
