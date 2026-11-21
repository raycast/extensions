import { getAppWindowEvidence, type AppWindowData } from "./app-window-evidence";
import type { AppGroup } from "./windows";

function isKnownSpace(space: number | undefined): space is number {
  return space !== undefined && Number.isSafeInteger(space) && space > 0;
}

/** Each app appears once; only complete Space data can place it in a single Space. */
export function groupApplicationsBySpace(apps: AppGroup[], data: AppWindowData) {
  const bySpace = new Map<number, AppGroup[]>();
  const multiple: AppGroup[] = [];
  const unknown: AppGroup[] = [];
  for (const app of apps) {
    const spaces = getAppWindowEvidence(app, data).windowSpaces;
    const knownSpaces = [...new Set(spaces.filter(isKnownSpace))];
    if (knownSpaces.length > 1) {
      multiple.push(app);
    } else if (knownSpaces.length === 1 && spaces.every(isKnownSpace)) {
      const space = knownSpaces[0];
      const group = bySpace.get(space) ?? [];
      group.push(app);
      bySpace.set(space, group);
    } else {
      unknown.push(app);
    }
  }
  return [
    ...[...bySpace.entries()]
      .sort(([a], [b]) => a - b)
      .map(([space, apps]) => ({ id: `space:${space}`, title: `Space ${space}`, apps })),
    { id: "space:multiple", title: "Multiple Spaces", apps: multiple },
    { id: "space:unknown", title: "Unknown Space", apps: unknown },
  ].filter((section) => section.apps.length > 0);
}
