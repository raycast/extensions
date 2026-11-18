import { VessloApp, VessloData } from "../types";
import { AppPolicyContext, canAccessAppPath } from "./app-policy";
import {
  AppPathAvailability,
  assessUpdateCount,
  homebrewReviewSnapshotReason,
  reviewSnapshotReason,
} from "./data-state";
import { homebrewReviewSelectionReason } from "./handoff-execution";
import { homebrewReadinessFingerprint } from "./homebrew-readiness";
import {
  ExecutableUpdateRoute,
  executableUpdateRoute,
  isHomebrewUpdateCandidate,
  isUpdatableApp,
  UpdateRouteGroup,
  updateRouteGroup,
} from "./update-filter";

export type AppUpdateAction =
  | { kind: "homebrewReview" }
  | { kind: "handoff"; bundleId: string; route: ExecutableUpdateRoute }
  | { kind: "openAppStore"; url: string }
  | { kind: "review"; reason: string }
  | { kind: "none" };

export interface AppActions {
  update: AppUpdateAction;
  canOpenApp: boolean;
  canShowInFinder: boolean;
  visibleInUpdates: boolean;
  route: UpdateRouteGroup;
  reviewReason: string | null;
  navigationBundleId: string | null;
}

function uniqueInstalledBundleId(
  app: VessloApp,
  context: AppPolicyContext,
): string | null {
  if (app.isDeleted || !app.bundleId) return null;
  const bundleMatches = context.data?.apps.filter(
    (candidate) => !candidate.isDeleted && candidate.bundleId === app.bundleId,
  );
  return bundleMatches?.length === 1 &&
    bundleMatches[0].id === app.id &&
    bundleMatches[0].path === app.path
    ? app.bundleId
    : null;
}

function resolveUpdateAction(
  app: VessloApp,
  context: AppPolicyContext,
): AppUpdateAction {
  if (app.isDeleted) {
    return { kind: "review", reason: "This is a deleted app record." };
  }
  const countAssessment = context.data
    ? (context.updateCountAssessment ?? assessUpdateCount(context.data))
    : null;
  if (countAssessment?.status === "mismatch") {
    return { kind: "review", reason: countAssessment.reason };
  }
  if (context.status !== "ready") {
    return {
      kind: "review",
      reason:
        "App data is not current. Open Vesslo and refresh before updating.",
    };
  }
  if (app.isIgnored || app.currentTargetSkipped === true)
    return { kind: "none" };
  if (app.exportContract !== "current") {
    if (app.exportContract === "legacy" && !isUpdatableApp(app)) {
      return { kind: "none" };
    }
    return {
      kind: "review",
      reason:
        "This export does not provide a supported action contract. Review and refresh in Vesslo.",
    };
  }
  if (countAssessment?.status !== "consistent") {
    return {
      kind: "review",
      reason:
        countAssessment?.reason ??
        "A verifiable Vesslo export is required before updating.",
    };
  }
  if (app.primaryActionKind === "refreshRequired") {
    return {
      kind: "review",
      reason:
        "Vesslo must recheck this update source before it can be updated.",
    };
  }
  const canBrowseAppStore =
    app.primaryActionKind === "openAppStore" &&
    app.eligibilityKind === "appStoreManualUpdate" &&
    typeof app.appStoreId === "string" &&
    /^\d+$/.test(app.appStoreId);
  const route = executableUpdateRoute(app);
  if (!route && !canBrowseAppStore) {
    if (app.primaryActionKind === "none" && !isUpdatableApp(app)) {
      return { kind: "none" };
    }
    return {
      kind: "review",
      reason:
        "This action is not approved for update handoff. Review this app in Vesslo.",
    };
  }
  if (!isUpdatableApp(app)) return { kind: "none" };
  if (
    (route === "sparkle" && !app.sources.includes("Sparkle")) ||
    ((route === "appStore" || canBrowseAppStore) &&
      !app.sources.includes("App Store")) ||
    (route === "manual" &&
      !app.sources.some((source) =>
        ["Brew", "Sparkle", "Manual"].includes(source),
      ))
  ) {
    return {
      kind: "review",
      reason:
        "The update action and exported source do not match. Review the source in Vesslo.",
    };
  }
  const snapshotReason = context.data
    ? route === "homebrew"
      ? homebrewReviewSnapshotReason(context.data)
      : reviewSnapshotReason(context.data)
    : "A checked Vesslo export is required.";
  if (snapshotReason) return { kind: "review", reason: snapshotReason };
  if (canBrowseAppStore) {
    return {
      kind: "openAppStore",
      url: `macappstore://apps.apple.com/app/id${app.appStoreId}`,
    };
  }
  if (!route) return { kind: "none" };
  if (route === "manual" && app.sources.includes("Brew") && app.homebrewCask) {
    return {
      kind: "review",
      reason:
        "This Homebrew installer requires review in Vesslo. The extension currently sends exact requests only for executable Homebrew updates.",
    };
  }
  if (!canAccessAppPath(app, context)) {
    return {
      kind: "review",
      reason:
        "The installed app path is unavailable or unverified. Recheck it in Vesslo.",
    };
  }
  if (route === "homebrew" && context.data) {
    const reason = homebrewReviewSelectionReason(
      context.data,
      [app],
      context.pathAvailability,
    );
    return reason ? { kind: "review", reason } : { kind: "homebrewReview" };
  }
  if (!app.bundleId) {
    return {
      kind: "review",
      reason: "This app has no Bundle ID for a Vesslo update handoff.",
    };
  }
  if (!uniqueInstalledBundleId(app, context)) {
    return {
      kind: "review",
      reason:
        "A unique installed app cannot be selected by Bundle ID. Review the target in Vesslo.",
    };
  }
  return { kind: "handoff", bundleId: app.bundleId, route };
}

/** Every command uses this policy; audit fields never grant or remove authority. */
export function resolveAppActions(
  app: VessloApp,
  context: AppPolicyContext,
): AppActions {
  const update = resolveUpdateAction(app, context);
  const canAccessPath = canAccessAppPath(app, context);
  return {
    update,
    canOpenApp: canAccessPath,
    canShowInFinder: canAccessPath,
    visibleInUpdates: isUpdatableApp(app),
    route: updateRouteGroup(app),
    navigationBundleId: uniqueInstalledBundleId(app, context),
    reviewReason:
      update.kind === "review"
        ? update.reason
        : canAccessPath
          ? null
          : "The installed app path is unavailable or unverified. Recheck it in Vesslo.",
  };
}

export function resolveBulkAction(
  apps: readonly VessloApp[],
  context: AppPolicyContext,
): {
  kind: "review";
  reason: string;
  candidates: VessloApp[];
  canSelect: boolean;
} {
  const countAssessment = context.data
    ? (context.updateCountAssessment ?? assessUpdateCount(context.data))
    : null;
  const reason =
    countAssessment && countAssessment.status !== "consistent"
      ? countAssessment.reason
      : context.status !== "ready"
        ? "App data is not current. Refresh in Vesslo before selecting a review request."
        : context.data
          ? homebrewReviewSnapshotReason(context.data)
          : "No Vesslo export is available.";
  return {
    kind: "review",
    reason:
      reason ??
      "Select 1–16 Homebrew apps. Vesslo will review these exact targets and ask for confirmation before updating.",
    canSelect: reason === null,
    candidates: apps.filter(isHomebrewUpdateCandidate),
  };
}

/** Only selected proofs affect a selection; unrelated source results can keep changing. */
export function homebrewSelectionDriftReason(
  selectedSnapshot: VessloData,
  currentSnapshot: VessloData,
  apps: readonly VessloApp[],
  paths?: Readonly<Record<string, AppPathAvailability>>,
  now: number = Date.now(),
): string | null {
  if (
    selectedSnapshot.schemaVersion !== currentSnapshot.schemaVersion ||
    JSON.stringify([...(selectedSnapshot.capabilities ?? [])].sort()) !==
      JSON.stringify([...(currentSnapshot.capabilities ?? [])].sort()) ||
    selectedSnapshot.publisherSessionId?.toLowerCase() !==
      currentSnapshot.publisherSessionId?.toLowerCase() ||
    selectedSnapshot.inventoryRevision !== currentSnapshot.inventoryRevision ||
    selectedSnapshot.checkRevision !== currentSnapshot.checkRevision ||
    selectedSnapshot.completedCheckRevision !==
      currentSnapshot.completedCheckRevision ||
    selectedSnapshot.completedInventoryRevision !==
      currentSnapshot.completedInventoryRevision ||
    (selectedSnapshot.schemaVersion === 2 &&
      selectedSnapshot.checkedInventoryRevision !==
        currentSnapshot.checkedInventoryRevision) ||
    (currentSnapshot.exportRevision ?? -1) <
      (selectedSnapshot.exportRevision ?? 0)
  ) {
    return "Inventory changed or the Homebrew review contract changed. Clear the selection and choose targets again.";
  }
  const originalReason = homebrewReviewSelectionReason(
    selectedSnapshot,
    apps,
    undefined,
    now,
  );
  if (originalReason) return originalReason;
  const currentReason = homebrewReviewSelectionReason(
    currentSnapshot,
    apps,
    paths,
    now,
  );
  if (currentReason) return currentReason;
  if (
    apps.some(
      (app) =>
        homebrewReadinessFingerprint(selectedSnapshot, app, now) !==
        homebrewReadinessFingerprint(currentSnapshot, app, now),
    )
  ) {
    return "A selected Homebrew readiness proof changed. Clear the selection and choose targets again.";
  }
  return null;
}
