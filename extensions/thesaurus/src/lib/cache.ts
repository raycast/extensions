import { Cache } from "@raycast/api";
import { Result } from "./types/types";

const wordCache = new Cache({
  namespace: "words",
});

const wordCacheHandler = () => {
  const set = (key: string, value: Result) => wordCache.set(key, JSON.stringify(value));
  const get = (key: string) => {
    const res = wordCache.get(key);
    if (res) {
      return JSON.parse(res) as Result;
    }
  };

  return {
    set,
    get,
    has: wordCache.has,
    remove: wordCache.remove,
    clear: wordCache.clear,
    subscribe: wordCache.subscribe,
  };
};

export default wordCacheHandler;
