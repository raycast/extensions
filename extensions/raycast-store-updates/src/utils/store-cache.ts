import { Cache } from "@raycast/api";
import { StoreItem } from "../types";

/**
 * Cache is synchronous and shared across the extension's commands. The menu-bar
 * command reads it on launch so the first render shows real data (no
 * "…" → count flicker), then refreshes in the background.
 */
const cache = new Cache({ namespace: "store-updates-menu-bar" });
const ITEMS_KEY = "items";
const LAST_SEEN_KEY = "last-seen";

export function getStoredItemsSync(): StoreItem[] {
  const raw = cache.get(ITEMS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoreItem[];
  } catch {
    return [];
  }
}

export function storeItems(items: StoreItem[]): void {
  cache.set(ITEMS_KEY, JSON.stringify(items));
}

/** Epoch (ms) up to which the user has acknowledged items. 0 = never. */
export function getLastSeen(): number {
  const raw = cache.get(LAST_SEEN_KEY);
  const value = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function setLastSeen(epochMs: number): void {
  cache.set(LAST_SEEN_KEY, String(epochMs));
}
