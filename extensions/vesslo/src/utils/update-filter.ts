import { VessloApp } from "../types";
import { isValidBrewCaskToken } from "./brew";

export function hasValidTargetVersion(
  targetVersion: string | null | undefined,
): boolean {
  if (typeof targetVersion !== "string") return false;
  const normalized = targetVersion.trim();
  return normalized !== "" && normalized !== "undefined";
}

export function isUpdatableApp(app: VessloApp): boolean {
  if (app.isDeleted || app.isIgnored || app.currentTargetSkipped === true) {
    return false;
  }
  // Preserve export visibility even for an unrecognized action, for review.
  if (typeof app.isVisibleInUpdates === "boolean") {
    return app.isVisibleInUpdates;
  }
  if (app.exportContract !== "legacy") return false;
  return !app.isSkipped && hasValidTargetVersion(app.targetVersion);
}

export type UpdateRouteGroup =
  | "homebrew"
  | "sparkle"
  | "appStore"
  | "manual"
  | "review";

export type ExecutableUpdateRoute = Exclude<UpdateRouteGroup, "review">;

/** Exact action/eligibility pairs are the execution allowlist. */
export function executableUpdateRoute(
  app: VessloApp,
): ExecutableUpdateRoute | null {
  if (app.exportContract !== "current") return null;
  switch (app.primaryActionKind) {
    case "runBrew":
      return app.eligibilityKind === "executableUpdate.homebrew" &&
        isValidBrewCaskToken(app.homebrewCask)
        ? "homebrew"
        : null;
    case "runSparkle":
      return app.eligibilityKind === "executableUpdate.sparkle"
        ? "sparkle"
        : null;
    case "runAppStore":
      return app.eligibilityKind === "executableUpdate.appStore" &&
        typeof app.appStoreId === "string" &&
        /^\d+$/.test(app.appStoreId)
        ? "appStore"
        : null;
    case "openInstaller":
      return app.eligibilityKind === "manualInstallerUpdate" ? "manual" : null;
    default:
      return null;
  }
}

export function updateRouteGroup(app: VessloApp): UpdateRouteGroup {
  const route = executableUpdateRoute(app);
  if (route) return route;
  if (
    app.exportContract === "current" &&
    app.primaryActionKind === "openAppStore" &&
    app.eligibilityKind === "appStoreManualUpdate"
  ) {
    return "appStore";
  }
  return "review";
}

/** A listing predicate, never execution authorization. Stale rows remain reviewable. */
export function isHomebrewUpdateCandidate(app: VessloApp): boolean {
  return isUpdatableApp(app) && executableUpdateRoute(app) === "homebrew";
}
