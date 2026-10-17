import { Icon, LocalStorage, type Image } from "@raycast/api";
import type { PushItem } from "./secure";
import { getSharedClient } from "./client";
import { debugLog } from "./logger";
import {
  LATEST_REFRESH_WAIT_MS,
  STALE_CACHE_THRESHOLD_MS,
  resolveLatestPushSelection,
  type LatestNetworkOutcome,
  type LatestPushResolution,
} from "./latest-policy";

const LAST_INBOX_SYNC_AT_KEY = "meta:last-inbox-sync-at";
const LATEST_PUSH_ITEM_KEY = "meta:latest-push-item";

async function readLastInboxSyncAt(): Promise<number | null> {
  const value = await LocalStorage.getItem<string>(LAST_INBOX_SYNC_AT_KEY);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function writeLastInboxSyncAt(timestamp: number): Promise<void> {
  await LocalStorage.setItem(LAST_INBOX_SYNC_AT_KEY, String(timestamp));
}

async function readLatestIndexedItem(): Promise<PushItem | null> {
  const value = await LocalStorage.getItem<string>(LATEST_PUSH_ITEM_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as PushItem;
  } catch {
    return null;
  }
}

async function writeLatestIndexedItem(item: PushItem | null): Promise<void> {
  if (!item) {
    await LocalStorage.removeItem(LATEST_PUSH_ITEM_KEY);
    return;
  }
  await LocalStorage.setItem(LATEST_PUSH_ITEM_KEY, JSON.stringify(item));
}

/**
 * Sync the secure push inbox. Rejects if network or store I/O fails —
 * callers should catch and fall back to listInbox() for cached items.
 *
 * NOTE: Updates the sync-freshness timestamp unconditionally. This is safe
 * because all callers gate on having an active session before calling, so
 * syncSecurePushInbox's local-only fallback path is never reached.
 */
export async function syncInbox(): Promise<PushItem[]> {
  const t0 = Date.now();
  const client = getSharedClient();
  const items = await client.syncSecurePushInbox();
  await Promise.all([writeLastInboxSyncAt(Date.now()), writeLatestIndexedItem(items[0] ?? null)]);
  debugLog(`[nibit] syncInbox: items=${items.length} latencyMs=${Date.now() - t0}`);
  return items;
}

export async function listInbox(): Promise<PushItem[]> {
  const client = getSharedClient();
  const items = await client.listSecurePushItems();
  await writeLatestIndexedItem(items[0] ?? null);
  return items;
}

export async function latestPushFast(): Promise<LatestPushResolution> {
  const t0 = Date.now();
  const cachedItem = (await readLatestIndexedItem()) ?? (await listInbox())[0] ?? null;
  const lastSyncAt = await readLastInboxSyncAt();
  const cacheAgeMs = lastSyncAt == null ? Number.POSITIVE_INFINITY : Math.max(0, Date.now() - lastSyncAt);

  const rawSync = syncInbox();

  // syncSettled resolves (never rejects) once the sync finishes or fails.
  // Callers should await it before exiting so the cache is warm next time.
  const syncSettled = rawSync.catch(() => {}).then(() => {});

  const syncPromise = rawSync
    .then((items): LatestNetworkOutcome => ({ status: "completed", item: items[0] ?? null }))
    .catch(
      (error): LatestNetworkOutcome => ({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );

  let resolution: LatestPushResolution;

  // No cache or cache is stale — wait for the full sync so we return the real item.
  if (!cachedItem || cacheAgeMs > STALE_CACHE_THRESHOLD_MS) {
    resolution = resolveLatestPushSelection({
      cachedItem,
      cacheAgeMs,
      network: await syncPromise,
      backgroundSync: syncSettled,
    });
  } else {
    // Cache is fresh — race sync against a short timeout for snappy UX.
    const network = await Promise.race<LatestNetworkOutcome>([
      syncPromise,
      new Promise((resolve) => {
        setTimeout(() => resolve({ status: "timeout" }), LATEST_REFRESH_WAIT_MS);
      }),
    ]);
    resolution = resolveLatestPushSelection({ cachedItem, cacheAgeMs, network, backgroundSync: syncSettled });
  }

  const latencyMs = Date.now() - t0;
  debugLog(
    `[nibit] latestPushFast: source=${resolution.source} stale=${resolution.stale} cacheAgeMs=${cacheAgeMs === Number.POSITIVE_INFINITY ? "none" : cacheAgeMs} latencyMs=${latencyMs} itemId=${resolution.item?.id ?? "null"}`,
  );

  return resolution;
}

export function isFileItem(item: PushItem): boolean {
  return item.channel === "blob" || item.content.startsWith("secure-blob:");
}

export function isUrlItem(item: PushItem): boolean {
  if (item.content_type === "text/plain") {
    return /^https?:\/\//i.test(item.content);
  }
  return false;
}

export function isImageItem(item: PushItem): boolean {
  return isFileItem(item) && item.content_type.startsWith("image/");
}

export function toFileMarkdownUrl(filePath: string): string {
  return `file://${encodeURI(filePath).replace(/\?/g, "%3F").replace(/#/g, "%23")}`;
}

export function itemIcon(item: PushItem): Image.ImageLike {
  if (isFileItem(item)) return Icon.Document;
  if (isUrlItem(item)) return Icon.Globe;
  return Icon.Text;
}
