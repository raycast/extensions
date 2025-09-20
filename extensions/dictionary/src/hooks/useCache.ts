import { Cache } from "@raycast/api";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

const cache = new Cache();
const useCache = (key: string) => {
  return {
    get() {
      return cache.get(key);
    },
    set(data: string) {
      cache.set(key, data);
    },
    on(sub: Cache.Subscriber) {
      return cache.subscribe(sub);
    },
    remove() {
      cache.remove(key);
    },
  };
};

export const useStatedCache = <T = undefined>(
  key: string | undefined
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] => {
  const cache = key
    ? useCache(key)
    : { get: () => undefined, set: (_data: string) => undefined, on: (_sub: Cache.Subscriber) => () => undefined };
  const v = cache.get();
  const [value, setValue] = useState<T | undefined>(v ? JSON.parse(v) : undefined);
  useEffect(() => {
    const sub = cache.on((k, v) => {
      // console.debug(`sub ${k}-${v}`)
      if (k === key) setValue(v ? JSON.parse(v) : undefined);
    });
    return () => sub();
  }, []);
  return [value, (prevState) => cache.set(JSON.stringify(prevState))];
};
export const useQuery = (query: string): [string | undefined, () => void] => {
  const validate = (query: string): [string, string] | [] => {
    const [type, key, value] = query.trim().split(" ");
    return (!!key && type === "-set" && [key, value]) || [];
  };
  const validated = validate(query);
  // console.debug(query, validated)
  const [data, setCache] = useStatedCache<string>(validated[0]);
  const setter = () => setCache(validated[1]);
  return [data, setter];
};
