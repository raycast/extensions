import { Cache, getPreferenceValues } from "@raycast/api";
import { ClearUrlsData } from "./types";

const RULES_URL =
  "https://raw.githubusercontent.com/ClearURLs/Rules/refs/heads/master/data.min.json";
const CACHE_KEY = "clearurls-rules-v1";

export interface CachedRules {
  data: string;
  fetchedAt: number;
}

interface Preferences {
  cacheTtlHours?: string;
}

function getTtlMs(): number {
  const prefs = getPreferenceValues<Preferences>();
  const hours = parseFloat(prefs.cacheTtlHours ?? "24");
  return (isNaN(hours) ? 24 : hours) * 60 * 60 * 1000;
}

const cache = new Cache();

export async function getRules(): Promise<{
  data: ClearUrlsData;
  fromCache: boolean;
  fetchedAt: number;
}> {
  const ttl = getTtlMs();
  const cached = cache.get(CACHE_KEY);

  if (cached) {
    try {
      const parsed: CachedRules = JSON.parse(cached);
      const age = Date.now() - parsed.fetchedAt;
      if (age < ttl) {
        return {
          data: JSON.parse(parsed.data),
          fromCache: true,
          fetchedAt: parsed.fetchedAt,
        };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return fetchRules();
}

export async function fetchRules(): Promise<{
  data: ClearUrlsData;
  fromCache: false;
  fetchedAt: number;
}> {
  const res = await fetch(RULES_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const data = JSON.parse(text) as ClearUrlsData;
  const fetchedAt = Date.now();
  cache.set(CACHE_KEY, JSON.stringify({ data: text, fetchedAt }));
  return { data, fromCache: false, fetchedAt };
}

export function clearRulesCache(): void {
  cache.remove(CACHE_KEY);
}
