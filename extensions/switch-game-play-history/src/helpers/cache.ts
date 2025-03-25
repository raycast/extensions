import { Cache } from "@raycast/api";
import { useEffect } from "react";
const cache = new Cache();
function getCache<T>(
  key: string,
  config?: {
    expiration?: number; // seconds
  }
) {
  const { expiration } = config || {};
  const set = (data: T) => {
    cache.set(
      key,
      JSON.stringify({
        value: data,
        timestamp: Date.now(),
        expiration,
      })
    );
  };
  const remove = () => {
    cache.remove(key);
  };
  const get = () => {
    const cached = cache.get(key);
    if (!cached) {
      return undefined;
    }
    const { value, timestamp, expiration } = JSON.parse(cached);
    if (expiration && Date.now() - timestamp > expiration * 1000) {
      remove();
      return undefined;
    }
    return value as T;
  };
  const getTimestamp = () => {
    const cached = cache.get(key);
    if (!cached) {
      return undefined;
    }
    const { timestamp } = JSON.parse(cached);
    return (timestamp as number) || undefined;
  };
  return { set, get, remove, getTimestamp };
}
export default getCache;
