import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { CacheManager } from "../cache/cache-manager";

export type KeyCodes = Map<string, string>;

interface IncomingKeyCodes {
  keyCodes: [string, string][];
}

const cacheManager = new CacheManager();
const CACHE_KEY = "key-codes";

export default function useKeyCodes() {
  const cachedItem = cacheManager.getCachedItem<IncomingKeyCodes>(CACHE_KEY);
  const [shouldUpdateCache] = useState(!cacheManager.cacheItemIsValid(cachedItem));
  const useKeyCodesFetchResult = useFetch<IncomingKeyCodes>("https://shortcuts.solomk.in/data/key-codes.json", {
    keepPreviousData: true,
    onData: (data) => {
      cacheManager.setValueWithTtl(CACHE_KEY, data);
    },
    execute: shouldUpdateCache,
  });

  if (cachedItem) {
    return {
      isLoading: false,
      data: new Map(cachedItem?.data.keyCodes),
    };
  }
  if (!useKeyCodesFetchResult.data) {
    return {
      isLoading: true,
      data: undefined,
    };
  }
  return {
    isLoading: false,
    data: new Map(useKeyCodesFetchResult?.data?.keyCodes),
  };
}
