import { VessloApp } from "../types";
import { isValidBrewCaskToken } from "./brew";

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
    | "targetVersion"
    | "isVisibleInUpdates"
    | "isDeleted"
    | "isSkipped"
    | "isIgnored"
  >,
): boolean {
  if (app.isDeleted || app.isSkipped || app.isIgnored) return false;
  if (typeof app.isVisibleInUpdates === "boolean") {
    return app.isVisibleInUpdates;
  }
  return hasValidTargetVersion(app.targetVersion);
}

export type UpdateRouteGroup = "homebrew" | "sparkle" | "appStore" | "manual";

function hasCurrentRoutingContract(
  app: Pick<VessloApp, "primaryActionKind" | "eligibilityKind">,
): boolean {
  return app.primaryActionKind !== null || app.eligibilityKind !== null;
}

export function updateRouteGroup(
  app: Pick<
    VessloApp,
    "isVisibleInUpdates" | "primaryActionKind" | "eligibilityKind" | "sources"
  >,
): UpdateRouteGroup {
  switch (app.primaryActionKind) {
    case "runBrew":
      return "homebrew";
    case "runSparkle":
      return "sparkle";
    case "runAppStore":
    case "openAppStore":
      return "appStore";
    case "openInstaller":
      return "manual";
  }

  if (app.eligibilityKind === "manualInstallerUpdate") {
    return "manual";
  }
  if (app.eligibilityKind?.startsWith("executableUpdate.homebrew")) {
    return "homebrew";
  }
  if (app.eligibilityKind?.startsWith("executableUpdate.sparkle")) {
    return "sparkle";
  }
  if (
    app.eligibilityKind?.startsWith("executableUpdate.appStore") ||
    app.eligibilityKind === "appStoreManualUpdate"
  ) {
    return "appStore";
  }

  if (hasCurrentRoutingContract(app)) {
    return "manual";
  }

  if (app.sources.includes("Brew")) return "homebrew";
  if (app.sources.includes("Sparkle")) return "sparkle";
  if (app.sources.includes("App Store")) return "appStore";
  return "manual";
}

export function isHomebrewUpdateCandidate(
  app: Pick<
    VessloApp,
    | "targetVersion"
    | "isVisibleInUpdates"
    | "isDeleted"
    | "isSkipped"
    | "isIgnored"
    | "primaryActionKind"
    | "eligibilityKind"
    | "sources"
    | "homebrewCask"
  >,
): boolean {
  return (
    isUpdatableApp(app) &&
    updateRouteGroup(app) === "homebrew" &&
    isValidBrewCaskToken(app.homebrewCask)
  );
}
