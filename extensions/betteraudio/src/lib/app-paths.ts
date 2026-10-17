import type { Application } from "@raycast/api";

export type AppPathMap = Record<string, string>;

export function buildAppPathMap(applications: Application[]): AppPathMap {
  const paths: AppPathMap = {};
  for (const application of applications) {
    if (application.bundleId) {
      paths[application.bundleId] = application.path;
    }
  }
  return paths;
}

export function getAppPath(
  paths: AppPathMap | undefined,
  bundleId: string | null | undefined,
): string | undefined {
  if (!bundleId || !paths) return undefined;
  return paths[bundleId];
}
