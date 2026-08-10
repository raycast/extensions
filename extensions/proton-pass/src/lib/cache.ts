import { LocalStorage } from "@raycast/api";
import { Item, Vault } from "./types";

const ITEMS_CACHE_KEY = "proton_pass_items_cache";
const VAULTS_CACHE_KEY = "proton_pass_vaults_cache";
const VAULT_ITEMS_CACHE_PREFIX = `${ITEMS_CACHE_KEY}_`;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

function isCacheValid<T>(cached: CachedData<T>): boolean {
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    if (!raw) return null;

    const cached: CachedData<T> = JSON.parse(raw);
    if (!isCacheValid(cached)) return null;

    return cached.data;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  const cached: CachedData<T> = { data, timestamp: Date.now() };
  await LocalStorage.setItem(key, JSON.stringify(cached));
}

export const getCachedItems = () => getCache<Item[]>(ITEMS_CACHE_KEY);
export const setCachedItems = (items: Item[]) => setCache(ITEMS_CACHE_KEY, items);

export const getCachedItemsForVault = (shareId: string) => getCache<Item[]>(`${ITEMS_CACHE_KEY}_${shareId}`);
export const setCachedItemsForVault = (shareId: string, items: Item[]) =>
  setCache(`${ITEMS_CACHE_KEY}_${shareId}`, items);

export const getCachedVaults = () => getCache<Vault[]>(VAULTS_CACHE_KEY);
export const setCachedVaults = (vaults: Vault[]) => setCache(VAULTS_CACHE_KEY, vaults);

export async function clearCache(): Promise<void> {
  const allCacheEntries = await LocalStorage.allItems();
  const keysToClear = Object.keys(allCacheEntries).filter(
    (key) => key === ITEMS_CACHE_KEY || key === VAULTS_CACHE_KEY || key.startsWith(VAULT_ITEMS_CACHE_PREFIX),
  );

  await Promise.all(keysToClear.map((key) => LocalStorage.removeItem(key)));
}
