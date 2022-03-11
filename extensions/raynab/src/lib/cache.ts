/**
 * Based of @thomaspaulnumann work on slack-search
 * @see https://github.com/raycast/extensions/blob/slack-search/extensions/slack-search/src/cache.tsx
 * */

import { resolve } from 'path';
import { environment } from '@raycast/api';
import { useEffect } from 'react';
import { LocalStorage } from 'node-localstorage';
import type { Middleware } from 'swr';

const SWR_CACHE_KEY = 'swr-cache';

const location = resolve(environment.supportPath, 'local-storage');
const localStorage = new LocalStorage(location);

const cache = localStorage.getItem(SWR_CACHE_KEY);
const cacheProvider = new Map<string, string>(cache ? JSON.parse(cache) : []);

const persistCacheMiddleware: Middleware = (useSWRNext) => {
  return (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config);

    useEffect(() => {
      try {
        const value = JSON.stringify(Array.from(cacheProvider.entries()));
        localStorage.setItem(SWR_CACHE_KEY, value);
      } catch (error) {
        console.error('Failed caching data', error);
      }
    }, [swr.data]);

    return swr;
  };
};

export const cacheConfig = {
  provider: () => cacheProvider,
  use: [persistCacheMiddleware],
};
