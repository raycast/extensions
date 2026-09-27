/**
 * Pure filters applied to the running-app list before it's used as history. No Raycast or Node imports so they
 * can be unit-tested with `node --test`.
 */

export interface HistoryApp {
  bundleId: string;
  name: string;
}

/**
 * Drops excluded apps (by bundle ID). The frontmost app (`apps[0]`) is always kept: it's where you are, and
 * `navigate()` relies on the first entry being the current app.
 */
export function excludeApps<T extends HistoryApp>(apps: T[], excluded: Set<string>): T[] {
  return apps.filter((app, i) => i === 0 || !excluded.has(app.bundleId));
}

/**
 * Apps removed from history by bundle ID, each with the bundle IDs that were ahead of it when it was removed.
 * `null` means it was removed while frontmost and you haven't left it yet.
 */
export type Removals = Record<string, string[] | null>;

/** Records `bundleId` as removed. `apps` is the history as shown, most recent first. */
export function removeApp(apps: HistoryApp[], bundleId: string, removals: Removals): Removals {
  const i = apps.findIndex((a) => a.bundleId === bundleId);
  if (i < 0) return removals;
  return { ...removals, [bundleId]: i === 0 ? null : apps.slice(0, i).map((a) => a.bundleId) };
}

/**
 * Hides removed apps and forgets removals that no longer apply. A removed app comes back once you use it again.
 * With no background process, that's read from the MRU order: the app is frontmost, or it moved ahead of an app
 * that was ahead of it when removed. Removals of apps that quit are forgotten too, and so are removals whose
 * ahead-apps have all quit (reuse can no longer be detected, so the app is shown rather than hidden for good).
 *
 * An app removed while frontmost stays pending (and visible, as the current app) until it's first seen behind
 * another app; the apps ahead of it at that point are recorded and the rule above applies from then on.
 * The frontmost app is never hidden: `navigate()` relies on the first entry being the current app.
 */
export function applyRemovals<T extends HistoryApp>(apps: T[], removals: Removals): { apps: T[]; removals: Removals } {
  const index = new Map(apps.map((a, i) => [a.bundleId, i]));
  const kept: Removals = {};
  for (const [bundleId, ahead] of Object.entries(removals)) {
    const i = index.get(bundleId);
    if (i === undefined) continue;
    if (ahead === null) {
      kept[bundleId] = i === 0 ? null : apps.slice(0, i).map((a) => a.bundleId);
      continue;
    }
    // Markers for apps that quit can't show reuse any more; with none left, reuse is undetectable, so show it again.
    const live = ahead.filter((a) => index.has(a));
    if (i === 0 || live.length === 0 || live.some((a) => index.get(a)! > i)) continue;
    kept[bundleId] = live;
  }
  return { apps: apps.filter((a, i) => i === 0 || !(a.bundleId in kept)), removals: kept };
}
