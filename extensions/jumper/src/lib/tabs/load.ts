// PURE: reading every app's tabs through its source, ordering them, and routing a selection back.

import type { App, Platform, Tab } from "./model";
import { sourceById, sourceFor } from "./registry";

export interface Failure {
  app: App;
  message: string;
}

export interface LoadResult {
  tabs: Tab[];
  failures: Failure[];
  /** False when Accessibility isn't granted: windows and sidebar sources then find nothing. */
  accessibility: boolean;
}

/**
 * Tabs of all `apps` (most recently used first), ordered by orderTabs. Apps are read in parallel, batched per
 * source when it supports it; one failing app becomes a Failure instead of hiding the others.
 */
export async function loadTabs(apps: App[], platform: Platform): Promise<LoadResult> {
  const groups = new Map<ReturnType<typeof sourceFor>, App[]>();
  for (const app of apps) {
    const source = sourceFor(app);
    groups.set(source, [...(groups.get(source) ?? []), app]);
  }

  const failures: Failure[] = [];
  const fail = (group: App[]) => (error: unknown) => {
    failures.push(...group.map((app) => ({ app, message: describeError(error) })));
    return [] as Tab[];
  };

  const reads = [...groups].flatMap(([source, group]) =>
    source.listAll
      ? [source.listAll(group, platform).catch(fail(group))]
      : group.map((app) => source.list(app, platform).catch(fail([app]))),
  );
  const [accessibility, ...results] = await Promise.all([platform.accessibilityTrusted(), ...reads]);
  return {
    tabs: orderTabs(
      results.flat(),
      apps.map((a) => a.bundleId),
    ),
    failures,
    accessibility,
  };
}

/** Select `tab` inside its app. The caller brings the app to the front afterwards. */
export async function selectTab(tab: Tab, platform: Platform): Promise<void> {
  const source = sourceById(tab.source);
  if (!source) throw new Error(`Unknown tab source "${tab.source}"`);
  await source.select(tab, platform);
}

/**
 * Apps in `recentBundleIds` order (unknown apps last); inside an app, active tabs first, then the app's own
 * order. Duplicate keys keep the first.
 */
export function orderTabs(tabs: Tab[], recentBundleIds: string[]): Tab[] {
  const rank = new Map(recentBundleIds.map((id, i) => [id, i]));
  const appRank = (t: Tab) => rank.get(t.app.bundleId) ?? Infinity;
  const seen = new Set<string>();
  return tabs
    .map((tab, i) => ({ tab, i }))
    .sort((a, b) => appRank(a.tab) - appRank(b.tab) || Number(b.tab.active) - Number(a.tab.active) || a.i - b.i)
    .map(({ tab }) => tab)
    .filter((tab) => !seen.has(tab.key) && seen.add(tab.key));
}

/** One-line reason for a failed read, with the fix for the common cases. */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/-1743|not authori[sz]ed/i.test(message)) return "Raycast isn't allowed to control this app (Automation)";
  if (/timed out|timeout/i.test(message)) return "The app didn't respond in time";
  return message.split("\n")[0];
}
