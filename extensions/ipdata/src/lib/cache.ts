// One-hour cache for lookups (two minutes for the user's own addresses) on top of Raycast's
// Cache, plus the most recent free-tier rate-limit headers. Not withCache: Refresh must bypass and
// overwrite a single entry (withCache can only clear its whole namespace), and a failed lookup is a
// resolved result that must not be cached (withCache stores every resolved value).
import { Cache, environment } from "@raycast/api";
import { lookup, myIp, LookupResult, MyIpResult, RateInfo, Settings } from "./ipdata";
import { settingsKey } from "./settings";

export const LOOKUP_TTL_MS = 60 * 60 * 1000;
export const MYIP_TTL_MS = 2 * 60 * 1000;

const cache = new Cache({ namespace: "ipdata" });

interface Entry<T> {
  t: number;
  ttl: number;
  r: T;
}

export function cacheGet<T>(key: string): T | null {
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.t < entry.ttl) return entry.r;
  } catch {
    /* corrupt entry */
  }
  cache.remove(key);
  return null;
}

export function cacheSet<T>(key: string, r: T, ttl: number): void {
  const entry: Entry<T> = { t: Date.now(), ttl, r };
  cache.set(key, JSON.stringify(entry));
}

export function clearCache(): void {
  cache.clear();
}

// The latest RateLimit-* headers seen from the free service (any command).
const RATE_KEY = "rate";
export function rememberRate(rate: RateInfo | null | undefined): void {
  if (rate) cache.set(RATE_KEY, JSON.stringify(rate));
}
export function getRate(): RateInfo | null {
  const raw = cache.get(RATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RateInfo;
  } catch {
    return null;
  }
}

export async function cachedLookup(ip: string, settings: Settings, force = false): Promise<LookupResult> {
  const key = `lk:${settingsKey(settings)}:${ip}`;
  if (!force) {
    const hit = cacheGet<LookupResult>(key);
    if (hit) return hit;
  }
  if (environment.isDevelopment) console.log(`[ipdata] GET ${ip} (${force ? "refresh" : "not cached"})`);
  const res = await lookup(ip, settings);
  if (!res.ok || res.rate) rememberRate(res.rate);
  if (res.ok) cacheSet(key, res, LOOKUP_TTL_MS);
  return res;
}

export async function cachedMyIp(settings: Settings, force = false): Promise<MyIpResult> {
  const key = `myip:${settingsKey(settings)}`;
  if (!force) {
    const hit = cacheGet<MyIpResult>(key);
    if (hit) return hit;
  }
  if (environment.isDevelopment) console.log(`[ipdata] GET own addresses (${force ? "refresh" : "not cached"})`);
  const res = await myIp(settings);
  if (res.ok) {
    rememberRate(res.rate);
    cacheSet(key, res, MYIP_TTL_MS);
  }
  return res;
}
