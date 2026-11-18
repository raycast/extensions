import { Cache } from "@raycast/api";

const cache = new Cache({
  capacity: 50 * 1e6,
});

const day = 24 * 60 * 60 * 1e3;
const isExpired = (time: number) => Date.now() - time > day;

type Cached<T> = {
  time?: number;
  data?: T[];
};

type CachedData<T> = { setCache: (data: T[]) => void } & (
  | {
      useCache: true;
      data: T[];
    }
  | {
      useCache: false;
      data: null;
    }
);

export const getCacheValue = <T>(cacheKey: string): CachedData<T> => {
  const cacheValue = cache.get(cacheKey);
  const setCache = (data: T[]) => {
    cache.set(cacheKey, JSON.stringify({ time: Date.now(), data }));
  };
  if (cacheValue) {
    try {
      const { time, data } = JSON.parse(cacheValue) as Cached<T>;
      if (time && !isExpired(time) && data && data.length) {
        return {
          setCache,
          useCache: true,
          data,
        };
      }
    } catch (e) {
      console.error("Couldn't parse cache", e);
    }
  }
  return {
    setCache,
    useCache: false,
    data: null,
  };
};
