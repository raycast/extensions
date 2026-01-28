/**
 * Based of @thomaspaulnumann work on slack-search
 * @see https://github.com/raycast/extensions/blob/slack-search/extensions/slack-search/src/cache.tsx
 * */

import { Cache } from '@raycast/api';
import { useEffect } from 'react';
import type { Middleware } from 'swr';

const SWR_CACHE_KEY = 'swr-cache';

const raycastCache = new Cache();

const currentCache = raycastCache.get(SWR_CACHE_KEY);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cacheProvider = new Map<any, any>(currentCache ? JSON.parse(currentCache) : []);

export const persistCacheMiddleware: Middleware = (useSWRNext) => {
  return (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config);

    useEffect(() => {
      try {
        const value = JSON.stringify(Array.from(cacheProvider.entries()));
        raycastCache.set(SWR_CACHE_KEY, value);
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
