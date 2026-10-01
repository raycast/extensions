import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Item, Vault } from "./types";

const ITEMS_CACHE_KEY = "proton_pass_items_cache";
const VAULTS_CACHE_KEY = "proton_pass_vaults_cache";
// Per-vault item caches were written by earlier versions; keep them available for offline vault views.
const VAULT_ITEMS_CACHE_PREFIX = `${ITEMS_CACHE_KEY}_`;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  /** True once the entry is older than the Cache Expiration preference. Stale data is still returned so it can be shown while a refresh runs. */
  isStale: boolean;
}

function isCacheFresh<T>(cached: CachedData<T>): boolean {
  const { cacheExpiration } = getPreferenceValues<Preferences>();

  const minutes = Number(cacheExpiration);
  const ttlMs = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : CACHE_TTL_MS;

  return Date.now() - cached.timestamp < ttlMs;
}

async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    if (!raw) return null;

    const cached: CachedData<T> = JSON.parse(raw);
    return { data: cached.data, isStale: !isCacheFresh(cached) };
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  const cached: CachedData<T> = { data, timestamp: Date.now() };
  await LocalStorage.setItem(key, JSON.stringify(cached));
}

export const getCachedItems = (shareId?: string) =>
  getCache<Item[]>(shareId ? `${VAULT_ITEMS_CACHE_PREFIX}${shareId}` : ITEMS_CACHE_KEY);
export const setCachedItems = (items: Item[]) => setCache(ITEMS_CACHE_KEY, items);

export const getCachedVaults = () => getCache<Vault[]>(VAULTS_CACHE_KEY);
export const setCachedVaults = (vaults: Vault[]) => setCache(VAULTS_CACHE_KEY, vaults);

export async function clearCache(): Promise<void> {
  const allCacheEntries = await LocalStorage.allItems();
  const keysToClear = Object.keys(allCacheEntries).filter(
    (key) => key === ITEMS_CACHE_KEY || key === VAULTS_CACHE_KEY || key.startsWith(VAULT_ITEMS_CACHE_PREFIX),
  );

  await Promise.all(keysToClear.map((key) => LocalStorage.removeItem(key)));
}
