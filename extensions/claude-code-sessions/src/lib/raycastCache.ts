import { Cache } from "@raycast/api";
import { KeyValueCache } from "./sessions";

/** Adapts Raycast's persistent `Cache` to the data layer's `KeyValueCache` contract. */
export function createRaycastCache(namespace: string): KeyValueCache {
  const cache = new Cache({ namespace });
  return {
    get(key: string) {
      return cache.get(key);
    },
    set(key: string, value: string) {
      cache.set(key, value);
    },
  };
}

/** The CLI session cache (`~/.claude/projects/*.jsonl` metadata), keyed by `path:mtime`. */
export function createRaycastSessionCache(): KeyValueCache {
  return createRaycastCache("claude-sessions");
}
