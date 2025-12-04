import type { Application } from "@raycast/api";

import path from "path";

export function filterApps(apps: Application[]): Application[] {
  return apps.filter((app) => isSystem(app.path) === false).sort((a, b) => a.name.localeCompare(b.name));
}

export function isSystem(appPath: string): boolean {
  const normalizedPath = path.normalize(appPath);
  if (normalizedPath.startsWith("/System/")) return true;
  return false;
}
