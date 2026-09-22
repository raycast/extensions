import { environment } from "@raycast/api";
import { resolve } from "path";
import { LocalStorage } from "node-localstorage";
import { Middleware } from "swr";
import { useEffect } from "react";

const SWR_CACHE_KEY = "swr-cache";

const location = resolve(environment.supportPath, "local-storage");
const localStorage = new LocalStorage(location);

const cache = localStorage.getItem(SWR_CACHE_KEY);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cacheProvider = new Map<string, any>(cache ? JSON.parse(cache) : []);

const persistCacheMiddleware: Middleware = (useSWRNext) => {
  return (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config);

    useEffect(() => {
      try {
        const value = JSON.stringify(Array.from(cacheProvider.entries()));
        localStorage.setItem(SWR_CACHE_KEY, value);
      } catch (error) {
        console.error("Failed persisting cache", error);
      }
    }, [swr.data]);

    return swr;
  };
};

export const cacheConfig = {
  provider: () => cacheProvider,
  use: [persistCacheMiddleware],
  revalidateIfStale: true,
  // The repo scan already retries transient 429/5xx per-request (see withRetry in
  // queries/index.ts) and surfaces a toast on failure. Without this, a hard failure
  // (e.g. the repo-listing call itself exhausting retries under sustained rate
  // limiting) has SWR silently re-run the *entire* scan from scratch in the
  // background, compounding with our own retries into what looks like it never stops.
  shouldRetryOnError: false,
};

export const REPOSITORIES_CACHE_KEY = "repositories";
