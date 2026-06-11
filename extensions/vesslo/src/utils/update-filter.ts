import { VessloApp } from "../types";

export function hasValidTargetVersion(
  targetVersion: string | null | undefined,
): boolean {
  if (typeof targetVersion !== "string") {
    return false;
  }

  const normalized = targetVersion.trim();
  return normalized !== "" && normalized !== "undefined";
}

export function isUpdatableApp(
  app: Pick<
    VessloApp,
    "targetVersion" | "isDeleted" | "isSkipped" | "isIgnored"
  >,
): boolean {
  if (app.isDeleted || app.isSkipped || app.isIgnored) return false;
  return hasValidTargetVersion(app.targetVersion);
}
