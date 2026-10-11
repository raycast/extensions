import { applyRemovals, excludeApps, removeApp, type Removals } from "./history";
import { getRecentApps } from "../platform/macos";
import type { App } from "../platform/model";
import { readJson, writeJson } from "../platform/storage";

const REMOVALS_KEY = "removed-apps";
const EXCLUDED_KEY = "excluded-apps";

/**
 * Running apps, most recent first, without apps removed from or excluded from history. The frontmost app is always
 * first; `currentHidden` says whether it's itself removed or excluded (navigation keeps it, the list hides it).
 */
export async function loadHistoryState(): Promise<{
  apps: App[];
  currentHidden: boolean;
  excluded: App[];
}> {
  const [recent, removals, excluded] = await Promise.all([
    getRecentApps(),
    readJson<Removals>(REMOVALS_KEY, {}),
    loadExcludedApps(),
  ]);
  const result = applyRemovals(recent, removals);
  if (JSON.stringify(result.removals) !== JSON.stringify(removals)) await writeJson(REMOVALS_KEY, result.removals);
  const excludedIds = new Set(excluded.map((a) => a.bundleId));
  const current = recent[0]?.bundleId;
  return {
    apps: excludeApps(result.apps, excludedIds),
    currentHidden: current !== undefined && (current in result.removals || excludedIds.has(current)),
    // Saved paths go stale if an app is moved or reinstalled; prefer the running copy's path.
    excluded: excluded.map((app) => recent.find((r) => r.bundleId === app.bundleId) ?? app),
  };
}

export async function loadHistory(): Promise<App[]> {
  return (await loadHistoryState()).apps;
}

/** Hides `app` from history until it's used again. `history` is the list as shown, most recent first. */
export async function removeFromHistory(history: App[], app: App): Promise<void> {
  await writeJson(REMOVALS_KEY, removeApp(history, app.bundleId, await readJson<Removals>(REMOVALS_KEY, {})));
}

/** Apps always skipped in history, in the order they were excluded. Kept with name and path to list them when not running. */
async function loadExcludedApps(): Promise<App[]> {
  return readJson<App[]>(EXCLUDED_KEY, []);
}

/** Excluded apps other than `app`. */
async function excludedExcept(app: App): Promise<App[]> {
  return (await loadExcludedApps()).filter((a) => a.bundleId !== app.bundleId);
}

export async function excludeFromHistory(app: App): Promise<void> {
  // Without the pid: it's only valid while this instance of the app runs.
  const { bundleId, name, path } = app;
  await writeJson(EXCLUDED_KEY, [...(await excludedExcept(app)), { bundleId, name, path }]);
}

export async function includeInHistory(app: App): Promise<void> {
  await writeJson(EXCLUDED_KEY, await excludedExcept(app));
}
