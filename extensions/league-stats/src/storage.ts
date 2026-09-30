import { Cache } from "@raycast/api";
import type { KV } from "./kv";

function kvFor(namespace: string): KV {
  const cache = new Cache({ namespace });
  return { get: (key) => cache.get(key), set: (key, value) => cache.set(key, value) };
}

/** Slimmed matches, kept indefinitely (they never change) until Raycast evicts the least recently used. */
export const matchKV = kvFor("matches");
/** Champion, item and spell tables from Data Dragon. */
export const staticsKV = kvFor("statics");
