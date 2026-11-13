import { UsageHistoryItem } from "../types";
import {
  getHistoryPairKey,
  getStarredPairs,
  getUsageHistory,
  setStarredPairs,
  setUsageHistory,
  withStorageLock,
} from "./storage";
import { cleanProfile } from "./url";

export { getHistoryPairKey };

export const MAX_HISTORY_ITEMS = 100;

/** The star shown on favorites, from the extension icon's gradient: its deep violet on light, its orchid on dark */
export const FAVORITE_COLOR = { light: "#7114F5", dark: "#BD24FA" };

/** Values of History's app filter that aren't app IDs */
export const HISTORY_FILTER = { ALL: "__all__", STARRED: "__starred__" } as const;

const pairKey = (item: Pick<UsageHistoryItem, "profile" | "app">) => getHistoryPairKey(item.profile, item.app);

/**
 * "once", "3 times"
 */
export function describeOpens(count: number): string {
  return count === 1 ? "once" : `${count} times`;
}

export function sortHistory(history: UsageHistoryItem[]): UsageHistoryItem[] {
  return [...history].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * History, most recent first
 */
export async function getHistory(): Promise<UsageHistoryItem[]> {
  return sortHistory(await getUsageHistory());
}

/**
 * Record an open: move the pair to the top and add one to its count
 */
export function recordProfileOpen(profile: string, app: string, appName: string): Promise<void> {
  return withStorageLock(async () => {
    const key = getHistoryPairKey(profile, app);
    const history = await getUsageHistory();
    const previousCount = history
      .filter((item) => pairKey(item) === key)
      .reduce((total, item) => total + item.count, 0);
    const others = history.filter((item) => pairKey(item) !== key);
    const entry: UsageHistoryItem = {
      profile: cleanProfile(profile),
      app,
      appName,
      timestamp: Date.now(),
      count: previousCount + 1,
    };
    await setUsageHistory([entry, ...sortHistory(others)].slice(0, MAX_HISTORY_ITEMS));
  });
}

export async function removeHistoryItem(profile: string, app: string): Promise<void> {
  const key = getHistoryPairKey(profile, app);
  await withStorageLock(async () => {
    await setUsageHistory((await getUsageHistory()).filter((item) => pairKey(item) !== key));
  });
}

/**
 * Rename a profile in History. If the new name already has an entry on the same app, the two merge.
 */
export function renameHistoryProfile(oldProfile: string, app: string, newProfile: string): Promise<void> {
  return withStorageLock(async () => {
    const oldKey = getHistoryPairKey(oldProfile, app);
    const newKey = getHistoryPairKey(newProfile, app);
    const history = await getUsageHistory();
    const matching = history.filter((item) => [oldKey, newKey].includes(pairKey(item)));
    const renamed = matching.find((item) => pairKey(item) === oldKey);
    if (!renamed) return;

    const merged: UsageHistoryItem = {
      ...renamed,
      profile: cleanProfile(newProfile),
      timestamp: Math.max(...matching.map((item) => item.timestamp)),
      count: matching.reduce((total, item) => total + item.count, 0),
    };
    const others = history.filter((item) => !matching.includes(item));
    await setUsageHistory(sortHistory([merged, ...others]));

    const starred = await getStarredPairs();
    if (starred.includes(oldKey)) {
      await setStarredPairs([...new Set(starred.map((pair) => (pair === oldKey ? newKey : pair)))]);
    }
  });
}

/**
 * Star or unstar, deciding inside the lock, so two requests to star can't cancel each other out
 * @returns false when it already was in that state
 */
export function setHistoryItemStarred(profile: string, app: string, starred: boolean): Promise<boolean> {
  const key = getHistoryPairKey(profile, app);
  return withStorageLock(async () => {
    const pairs = await getStarredPairs();
    if (pairs.includes(key) === starred) return false;
    await setStarredPairs(starred ? [...pairs, key] : pairs.filter((pair) => pair !== key));
    return true;
  });
}

/**
 * @returns the new starred state
 */
export function toggleStarredHistoryItem(profile: string, app: string): Promise<boolean> {
  const key = getHistoryPairKey(profile, app);
  return withStorageLock(async () => {
    const starred = await getStarredPairs();
    if (starred.includes(key)) {
      await setStarredPairs(starred.filter((pair) => pair !== key));
      return false;
    }
    await setStarredPairs([...starred, key]);
    return true;
  });
}

export async function clearStarredHistoryItems(): Promise<void> {
  await withStorageLock(() => setStarredPairs([]));
}

/**
 * History, most recent first, with each entry's starred state
 */
export async function getHistoryWithStars(): Promise<(UsageHistoryItem & { isStarred: boolean })[]> {
  const [history, starred] = await Promise.all([getHistory(), getStarredPairs()]);
  const starredSet = new Set(starred);
  return history.map((item) => ({ ...item, isStarred: starredSet.has(pairKey(item)) }));
}

/**
 * Starred History, most recent first, optionally filtered by app ID or name
 */
export async function getStarredHistory(app?: string, limit?: number): Promise<UsageHistoryItem[]> {
  const starred = (await getHistoryWithStars()).filter((item) => item.isStarred);
  const filtered = filterHistoryByApp(starred, app);
  return limit === undefined ? filtered : filtered.slice(0, limit);
}

export function filterHistoryByApp(history: UsageHistoryItem[], app?: string): UsageHistoryItem[] {
  if (!app) return history;
  const query = app.trim().toLowerCase();
  return history.filter((item) => item.app.toLowerCase() === query || item.appName.toLowerCase().includes(query));
}
