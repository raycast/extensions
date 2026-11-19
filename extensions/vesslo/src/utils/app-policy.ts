import { isAbsolute } from "path";
import { ExportContract, VessloApp, VessloData } from "../types";

import type {
  AppPathAvailability,
  UpdateCountAssessment,
  VessloDataStatus,
} from "./data-state";

export type PathAvailability = AppPathAvailability;

export interface AppPolicyContext {
  status: VessloDataStatus;
  data: VessloData | null;
  pathAvailability: Readonly<Record<string, PathAvailability>>;
  updateCountAssessment?: UpdateCountAssessment;
}

const CONTRACT_KEYS = [
  "isVisibleInUpdates",
  "eligibilityKind",
  "primaryActionKind",
  "currentTargetSkipped",
  "hasAnySkippedVersion",
] as const;

/** A partial or malformed current contract must never regain legacy authority. */
export function classifyExportContract(
  raw: Record<string, unknown>,
): ExportContract {
  if (
    !CONTRACT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(raw, key))
  ) {
    return "legacy";
  }
  if (
    typeof raw.isVisibleInUpdates !== "boolean" ||
    typeof raw.eligibilityKind !== "string" ||
    !raw.eligibilityKind.trim() ||
    typeof raw.primaryActionKind !== "string" ||
    !raw.primaryActionKind.trim()
  ) {
    return "unsupported";
  }
  for (const key of ["currentTargetSkipped", "hasAnySkippedVersion"] as const) {
    if (
      Object.prototype.hasOwnProperty.call(raw, key) &&
      typeof raw[key] !== "boolean"
    ) {
      return "unsupported";
    }
  }
  return "current";
}

export function isInstalledApp(app: Pick<VessloApp, "isDeleted">): boolean {
  return !app.isDeleted;
}

export function installedApps(apps: readonly VessloApp[]): VessloApp[] {
  return apps.filter(isInstalledApp);
}

export function canAccessAppPath(
  app: Pick<VessloApp, "isDeleted" | "path">,
  context: AppPolicyContext,
): boolean {
  return (
    context.status === "ready" &&
    isInstalledApp(app) &&
    isAbsolute(app.path) &&
    !app.path.includes("\0") &&
    context.pathAvailability[app.path] === "available"
  );
}
