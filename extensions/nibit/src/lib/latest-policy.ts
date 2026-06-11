import type { PushItem } from "./secure";

export const LATEST_REFRESH_WAIT_MS = 250;
export const STALE_CACHE_THRESHOLD_MS = 60_000;

export type LatestNetworkOutcome =
  | { status: "completed"; item: PushItem | null }
  | { status: "timeout" }
  | { status: "error"; message: string };

export type LatestPushResolution = {
  item: PushItem | null;
  stale: boolean;
  staleReason: "timeout" | "error" | null;
  source: "cache" | "network" | "none";
  /** Resolves when the background sync finishes (even if it errors). Await
   *  this before the process exits so the local cache is warm for next time. */
  backgroundSync: Promise<void>;
};

function itemTimestamp(item: PushItem | null): number {
  if (!item) return 0;
  const parsed = Date.parse(item.created_at);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isNewerItem(candidate: PushItem | null, current: PushItem | null): boolean {
  return itemTimestamp(candidate) > itemTimestamp(current);
}

export function resolveLatestPushSelection(args: {
  cachedItem: PushItem | null;
  cacheAgeMs: number;
  network: LatestNetworkOutcome;
  backgroundSync: Promise<void>;
}): LatestPushResolution {
  const { cachedItem, cacheAgeMs, network, backgroundSync } = args;

  if (!cachedItem) {
    if (network.status === "completed") {
      return {
        item: network.item,
        stale: false,
        staleReason: null,
        source: network.item ? "network" : "none",
        backgroundSync,
      };
    }
    return {
      item: null,
      stale: false,
      staleReason: null,
      source: "none",
      backgroundSync,
    };
  }

  if (network.status === "completed") {
    // Sync is authoritative. Use the network item when it's newer OR when the
    // inbox is now empty (network.item is null = last item was deleted/expired).
    if (isNewerItem(network.item, cachedItem) || !network.item) {
      return {
        item: network.item,
        stale: false,
        staleReason: null,
        source: network.item ? "network" : "none",
        backgroundSync,
      };
    }
    return {
      item: cachedItem,
      stale: false,
      staleReason: null,
      source: "cache",
      backgroundSync,
    };
  }

  const stale = cacheAgeMs > STALE_CACHE_THRESHOLD_MS;
  return {
    item: cachedItem,
    stale,
    staleReason: stale ? network.status : null,
    source: "cache",
    backgroundSync,
  };
}
