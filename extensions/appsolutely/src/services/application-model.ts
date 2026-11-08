import { normalize } from "node:path";
import type { DiscoveredApplication, LauncherApplication } from "../models/application.ts";
import type { AppAssignment, LauncherState } from "../models/folder.ts";
import { byName } from "../utils/sorting.ts";

export function normalizeAppPath(path: string): string {
  // Preserve case: macOS also supports case-sensitive application volumes.
  return normalize(path).replace(/\/$/, "").normalize("NFC");
}

export function prepareApplications(discovered: DiscoveredApplication[]): LauncherApplication[] {
  const unique = new Map<string, DiscoveredApplication>();
  for (const app of discovered) {
    if (!app.path || !app.name) continue;
    const path = normalizeAppPath(app.path);
    const previous = unique.get(path);
    if (!previous || (!previous.bundleId && app.bundleId)) unique.set(path, { ...app, path });
  }
  const groups = new Map<string, DiscoveredApplication[]>();
  for (const app of unique.values()) {
    const key = app.bundleId ? `bundle:${app.bundleId}` : `path:${app.path}`;
    groups.set(key, [...(groups.get(key) ?? []), app]);
  }
  return [...groups.entries()]
    .flatMap(([stableId, apps]) =>
      apps
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((app, index) => ({
          ...app,
          id: `path:${app.path}`,
          stableId,
          hasMultipleInstallations: apps.length > 1,
          isPreferredInstallation: index === 0,
        })),
    )
    .sort((a, b) => byName(a, b) || a.path.localeCompare(b.path));
}

const assignmentIndexes = new WeakMap<LauncherState, Map<string, AppAssignment>>();

export function assignmentFor(app: LauncherApplication, state: LauncherState): AppAssignment | undefined {
  let index = assignmentIndexes.get(state);
  if (!index) {
    index = new Map();
    for (const assignment of state.assignments) {
      if (!index.has(assignment.appId)) index.set(assignment.appId, assignment);
    }
    assignmentIndexes.set(state, index);
  }
  const specific = index.get(app.id);
  if (specific) return specific;
  const stable = index.get(app.stableId);
  if (!stable || !app.hasMultipleInstallations) return stable;
  return (stable.appPath ? stable.appPath === app.path : app.isPreferredInstallation) ? stable : undefined;
}

export function moveApplication(
  state: LauncherState,
  app: LauncherApplication,
  folderId: string | null,
): LauncherState {
  if (folderId !== null && !state.folders.some((f) => f.id === folderId)) {
    throw new Error("This folder no longer exists. Choose another folder.");
  }
  const appId = app.hasMultipleInstallations ? app.id : app.stableId;
  const assignments = state.assignments.filter((a) =>
    app.hasMultipleInstallations ? a.appId !== app.id : a.appId !== app.id && a.appId !== app.stableId,
  );
  const existing = assignmentFor(app, state);
  return {
    ...state,
    assignments: [...assignments, { appId, folderId, order: existing?.order ?? 0, appPath: app.path }],
  };
}

export function searchApplications(apps: LauncherApplication[], query: string): LauncherApplication[] {
  const needle = query.trim().toLocaleLowerCase();
  return apps.filter((app) => app.name.toLocaleLowerCase().includes(needle));
}
