import { LocalStorage } from "@raycast/api";

/**
 * Per-user overrides of Sparkle feed URLs. When our scanner can't find or
 * can't parse an app's auto-detected SUFeedURL, the user can paste a working
 * URL here and the scanner picks it up on the next refresh.
 *
 * Keyed by CFBundleIdentifier.
 */
const KEY = "mac-updater-user-sparkle-feeds-v1";

type FeedMap = Record<string, string>;

async function read(): Promise<FeedMap> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FeedMap;
  } catch {
    return {};
  }
}

async function write(map: FeedMap): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(map));
}

let cache: FeedMap | null = null;

export async function refreshUserSparkleFeedsCache(): Promise<void> {
  cache = await read();
}

export function getCachedUserSparkleFeed(bundleId: string): string | undefined {
  return cache?.[bundleId];
}

export async function setUserSparkleFeed(
  bundleId: string,
  url: string,
): Promise<void> {
  const map = await read();
  map[bundleId] = url;
  await write(map);
}

export async function removeUserSparkleFeed(bundleId: string): Promise<void> {
  const map = await read();
  delete map[bundleId];
  await write(map);
}

export async function getAllUserSparkleFeeds(): Promise<FeedMap> {
  return read();
}
