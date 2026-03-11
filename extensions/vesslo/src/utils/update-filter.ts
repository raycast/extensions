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

export function isUpdatableApp(app: Pick<VessloApp, "targetVersion">): boolean {
  return hasValidTargetVersion(app.targetVersion);
}
