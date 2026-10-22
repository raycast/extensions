import type { Application } from "@raycast/api";

export interface AppRecord {
  opens: number;
  timeZone?: string;
}

export type AppRecords = Record<string, AppRecord>;

/** Pinned apps keep their pin order; opened apps are sorted by open count (desc), then by name. */
export function rankApps(apps: Application[], records: AppRecords, pinnedPaths: string[]) {
  const opens = (app: Application) => records[app.path]?.opens ?? 0;
  const byPath = new Map(apps.map((app) => [app.path, app]));
  const pinned = pinnedPaths.flatMap((path) => byPath.get(path) ?? []);
  const pinnedSet = new Set(pinnedPaths);
  const unpinned = apps.filter((app) => !pinnedSet.has(app.path));
  const frequent = unpinned
    .filter((app) => opens(app) > 0)
    .sort((a, b) => opens(b) - opens(a) || a.name.localeCompare(b.name));
  const rest = unpinned.filter((app) => opens(app) === 0);
  return { pinned, frequent, rest };
}
