import { Cache as RaycastCache } from "@raycast/api";
import { CACHE_KEYS } from "~/constants/general";

const _cache = new RaycastCache({ namespace: "bw-cache" });

const getCacheActions = (key: string) => ({
  get: () => _cache.get(key),
  set: (value: string | number | boolean) => _cache.set(key, String(value)),
  remove: () => _cache.remove(key),
});

export const Cache = {
  has: _cache.has,
  set: _cache.set,
  get: _cache.get,
  remove: _cache.remove,
  clear: _cache.clear,
  isEmpty: _cache.isEmpty,
  subscribe: _cache.subscribe,

  // specific actions
  vaultLockReason: getCacheActions(CACHE_KEYS.LOCK_REASON),
};
