import { Cache } from "@raycast/api";
import { parseAgentList } from "./parse-bot";
import { Bot } from "./types";

const cache = new Cache({ namespace: "roster" });
const CACHE_KEY = "bots";

export function readCachedBots(): Bot[] {
  const raw = cache.get(CACHE_KEY);
  if (raw === undefined) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const bots = parseAgentList(parsed);
    return bots.ok ? bots.value : [];
  } catch {
    return [];
  }
}

export function writeCachedBots(bots: Bot[]): void {
  cache.set(CACHE_KEY, JSON.stringify(bots));
}
