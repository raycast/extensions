import { VessloApp, VessloData } from "../types";
import {
  AppPathAvailability,
  assessUpdateCount,
  homebrewReviewSnapshotReason,
  VessloDataState,
} from "./data-state";
import {
  buildHomebrewReviewURL,
  HANDOFF_MAX_TARGETS,
  HANDOFF_REQUEST_LIFETIME_MS,
  HandoffRequest,
  HandoffTarget,
  handoffRequestReason,
  parseHandoffRequest,
  parseHandoffTarget,
} from "./handoff-contract";
import {
  homebrewReadinessEvidenceId,
  homebrewReadinessFingerprint,
  homebrewTargetReadinessReason,
} from "./homebrew-readiness";

function targetFor(app: VessloApp): HandoffTarget | null {
  return parseHandoffTarget({
    appId: app.id,
    bundleId: app.bundleId,
    canonicalPath: app.path,
    caskToken: app.homebrewCask,
    installedVersion: app.version,
    expectedTargetVersion: app.targetVersion,
  });
}

function sameTarget(left: HandoffTarget, right: HandoffTarget): boolean {
  return (
    left.appId.toLowerCase() === right.appId.toLowerCase() &&
    left.bundleId === right.bundleId &&
    left.canonicalPath === right.canonicalPath &&
    left.caskToken === right.caskToken &&
    left.installedVersion === right.installedVersion &&
    left.expectedTargetVersion === right.expectedTargetVersion
  );
}

function candidateReason(app: VessloApp): string | null {
  if (app.isDeleted) return "A selected app is marked deleted.";
  if (app.isIgnored) return "A selected app is ignored.";
  if (app.currentTargetSkipped !== false)
    return "A selected target is skipped or its current skip state is unavailable.";
  if (
    app.exportContract !== "current" ||
    app.isVisibleInUpdates !== true ||
    app.primaryActionKind !== "runBrew" ||
    app.eligibilityKind !== "executableUpdate.homebrew" ||
    !app.sources.includes("Brew")
  )
    return "A selected app is not currently eligible for a Homebrew update.";
  if (!targetFor(app))
    return "A selected app has an invalid UUID, canonical path, cask, or version identity.";
  return null;
}

/** An omitted path map supports a pure preview; submission always supplies freshly checked paths. */
export function homebrewReviewSelectionReason(
  data: VessloData,
  apps: readonly VessloApp[],
  paths?: Readonly<Record<string, AppPathAvailability>>,
  now: number = Date.now(),
): string | null {
  const snapshotReason = homebrewReviewSnapshotReason(data, now);
  if (snapshotReason) return snapshotReason;
  const count = assessUpdateCount(data);
  if (count.status !== "consistent") return count.reason;
  if (apps.length < 1 || apps.length > HANDOFF_MAX_TARGETS)
    return `Select between 1 and ${HANDOFF_MAX_TARGETS} Homebrew apps to review.`;
  const ids = new Set<string>();
  const selectedPaths = new Set<string>();
  const casks = new Set<string>();
  for (const selected of apps) {
    const invalid = candidateReason(selected);
    if (invalid) return invalid;
    const readiness = homebrewTargetReadinessReason(data, selected, now);
    if (readiness) return readiness;
    const target = targetFor(selected)!;
    const id = target.appId.toLowerCase();
    if (
      ids.has(id) ||
      selectedPaths.has(target.canonicalPath) ||
      casks.has(target.caskToken)
    )
      return "The selection contains a duplicate app UUID, path, or Homebrew cask.";
    ids.add(id);
    selectedPaths.add(target.canonicalPath);
    casks.add(target.caskToken);
    const matches = data.apps.filter((app) => app.id.toLowerCase() === id);
    if (matches.length !== 1)
      return "A selected installation is missing or ambiguous in the current inventory.";
    const actual = matches[0];
    const actualTarget = targetFor(actual);
    if (
      candidateReason(actual) ||
      !actualTarget ||
      !sameTarget(target, actualTarget)
    )
      return "A selected installation, source, or version changed. Reload and select the current targets.";
    if (
      data.apps.some(
        (app) =>
          !app.isDeleted &&
          app.sources.includes("Brew") &&
          app.homebrewCask === target.caskToken &&
          app.id.toLowerCase() !== id,
      )
    )
      return "Another installation uses a selected Homebrew cask. Review the ambiguous installations in Vesslo.";
    if (paths && paths[target.canonicalPath] !== "available")
      return paths[target.canonicalPath] === "permissionDenied"
        ? "Access to a selected app path was denied. Review it in Vesslo."
        : "A selected app path is missing or could not be verified. Reload before reviewing.";
  }
  return null;
}

export function buildHomebrewReviewRequest(
  data: VessloData,
  apps: readonly VessloApp[],
  requestId: string,
  now: number,
): HandoffRequest {
  const reason = homebrewReviewSelectionReason(data, apps, undefined, now);
  if (reason) throw new Error(reason);
  const request = parseHandoffRequest({
    schemaVersion: data.schemaVersion === 3 ? 2 : 1,
    requestId,
    publisherSessionId: data.publisherSessionId,
    createdAt: new Date(now).toISOString(),
    inventoryRevision: data.inventoryRevision,
    completedCheckRevision: data.completedCheckRevision,
    source: "homebrew",
    targets: apps.map((app) => ({
      ...targetFor(app)!,
      ...(data.schemaVersion === 3
        ? { readinessEvidenceId: homebrewReadinessEvidenceId(data, app, now) }
        : {}),
    })),
  });
  if (!request)
    throw new Error(
      "The selected targets cannot form a bounded, valid Homebrew review request.",
    );
  return request;
}

export type HomebrewReviewResult =
  | { kind: "opened"; request: HandoffRequest; url: string }
  | { kind: "blocked"; reason: string };

interface ReviewExecutorDependencies {
  /** The caller must force a disk read; cached render state is not admission evidence. */
  read(): Promise<VessloDataState>;
  open(url: string): Promise<void>;
  now(): number;
  uuid(): string;
}

/** Opening this review URL requests a Vesslo review, never acceptance or completion. */
export function createHomebrewReviewExecutor(
  dependencies: ReviewExecutorDependencies,
) {
  let pending = false;
  const openedSelections = new Map<string, number>();
  return async (
    displayedSnapshot: VessloData,
    displayedApps: readonly VessloApp[],
  ): Promise<HomebrewReviewResult> => {
    if (pending)
      return {
        kind: "blocked",
        reason: "A Homebrew review request is already being prepared.",
      };
    pending = true;
    try {
      const createdAt = dependencies.now();
      const request = buildHomebrewReviewRequest(
        displayedSnapshot,
        displayedApps,
        dependencies.uuid(),
        createdAt,
      );
      const selected = displayedApps.map((app) => ({
        ...app,
        sources: [...app.sources],
      }));
      const revisionAtSelection = {
        schemaVersion: displayedSnapshot.schemaVersion,
        publisherSessionId: displayedSnapshot.publisherSessionId,
        inventoryRevision: displayedSnapshot.inventoryRevision,
        checkRevision: displayedSnapshot.checkRevision,
        completedCheckRevision: displayedSnapshot.completedCheckRevision,
        checkedInventoryRevision: displayedSnapshot.checkedInventoryRevision,
        completedInventoryRevision:
          displayedSnapshot.completedInventoryRevision,
        exportRevision: displayedSnapshot.exportRevision,
      };
      const evidenceAtSelection = selected.map((app) =>
        homebrewReadinessFingerprint(displayedSnapshot, app, createdAt),
      );
      const key = JSON.stringify([
        request.schemaVersion,
        request.publisherSessionId.toLowerCase(),
        request.inventoryRevision,
        request.completedCheckRevision,
        [...request.targets].sort((a, b) => a.appId.localeCompare(b.appId)),
      ]);
      for (const [oldKey, at] of openedSelections) {
        if (createdAt - at > HANDOFF_REQUEST_LIFETIME_MS)
          openedSelections.delete(oldKey);
      }
      if (openedSelections.has(key))
        return {
          kind: "blocked",
          reason:
            "This selection was already sent for review. Check its request receipt in Vesslo before sending again.",
        };
      if (openedSelections.size >= 128)
        return {
          kind: "blocked",
          reason:
            "Too many review requests are awaiting their submission lifetime. Check the existing requests first.",
        };
      const current = await dependencies.read();
      if (current.status !== "ready" || !current.data)
        return {
          kind: "blocked",
          reason:
            current.reason ??
            "The current Vesslo export is not ready for a review request.",
        };
      const data = current.data;
      const now = dependencies.now();
      const reason = homebrewReviewSelectionReason(
        data,
        selected,
        current.pathAvailability,
        now,
      );
      if (reason) return { kind: "blocked", reason };
      if (
        data.schemaVersion !== revisionAtSelection.schemaVersion ||
        data.publisherSessionId?.toLowerCase() !==
          revisionAtSelection.publisherSessionId?.toLowerCase() ||
        data.inventoryRevision !== revisionAtSelection.inventoryRevision ||
        data.completedCheckRevision !==
          revisionAtSelection.completedCheckRevision ||
        data.checkRevision !== revisionAtSelection.checkRevision ||
        (data.schemaVersion === 3
          ? data.completedInventoryRevision !==
            revisionAtSelection.completedInventoryRevision
          : data.checkedInventoryRevision !==
            revisionAtSelection.checkedInventoryRevision) ||
        (data.exportRevision ?? -1) < (revisionAtSelection.exportRevision ?? 0)
      )
        return {
          kind: "blocked",
          reason:
            "Vesslo's session, inventory, or completed check changed after selection. Reload and review the current targets.",
        };
      if (
        selected.some(
          (app, index) =>
            homebrewReadinessFingerprint(data, app, now) !==
            evidenceAtSelection[index],
        )
      )
        return {
          kind: "blocked",
          reason:
            "A selected Homebrew source-check evidence changed after selection. Reload and review the current targets.",
        };
      const temporalReason = handoffRequestReason(request, now);
      if (temporalReason)
        return {
          kind: "blocked",
          reason: `The Homebrew review request is no longer valid (${temporalReason}). Select the current targets again.`,
        };
      const url = buildHomebrewReviewURL(request);
      await dependencies.open(url);
      openedSelections.set(key, createdAt);
      return { kind: "opened", request, url };
    } catch (error) {
      return {
        kind: "blocked",
        reason:
          error instanceof Error
            ? error.message
            : "The Homebrew review request could not be prepared or opened.",
      };
    } finally {
      pending = false;
    }
  };
}
