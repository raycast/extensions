import { LocalStorage } from "@raycast/api";
import { applyRemovals, excludeApps, removeApp, type Removals } from "./history";
import { getRecentApps, type RunningApp } from "./macos";

const REMOVALS_KEY = "removed-apps";
const EXCLUDED_KEY = "excluded-apps";

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function write(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

/**
 * Running apps, most recent first, without apps removed from or excluded from history. The frontmost app is always
 * first; `currentHidden` says whether it's itself removed or excluded (navigation keeps it, the list hides it).
 */
export async function loadHistoryState(): Promise<{
  apps: RunningApp[];
  currentHidden: boolean;
  excluded: RunningApp[];
}> {
  const [recent, removals, excluded] = await Promise.all([
    getRecentApps(),
    read<Removals>(REMOVALS_KEY, {}),
    loadExcludedApps(),
  ]);
  const result = applyRemovals(recent, removals);
  if (JSON.stringify(result.removals) !== JSON.stringify(removals)) await write(REMOVALS_KEY, result.removals);
  const excludedIds = new Set(excluded.map((a) => a.bundleId));
  const current = recent[0]?.bundleId;
  return {
    apps: excludeApps(result.apps, excludedIds),
    currentHidden: current !== undefined && (current in result.removals || excludedIds.has(current)),
    // Saved paths go stale if an app is moved or reinstalled; prefer the running copy's path.
    excluded: excluded.map((app) => recent.find((r) => r.bundleId === app.bundleId) ?? app),
  };
}

export async function loadHistory(): Promise<RunningApp[]> {
  return (await loadHistoryState()).apps;
}

/** Hides `app` from history until it's used again. `history` is the list as shown, most recent first. */
export async function removeFromHistory(history: RunningApp[], app: RunningApp): Promise<void> {
  await write(REMOVALS_KEY, removeApp(history, app.bundleId, await read<Removals>(REMOVALS_KEY, {})));
}

/** Apps always skipped in history, in the order they were excluded. Kept with name and path to list them when not running. */
export async function loadExcludedApps(): Promise<RunningApp[]> {
  return read<RunningApp[]>(EXCLUDED_KEY, []);
}

export async function excludeFromHistory(app: RunningApp): Promise<void> {
  const excluded = await loadExcludedApps();
  await write(EXCLUDED_KEY, [...excluded.filter((a) => a.bundleId !== app.bundleId), app]);
}

export async function includeInHistory(app: RunningApp): Promise<void> {
  const excluded = await loadExcludedApps();
  await write(
    EXCLUDED_KEY,
    excluded.filter((a) => a.bundleId !== app.bundleId),
  );
}
