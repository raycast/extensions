import { HomebrewReadinessEvidence, VessloApp, VessloData } from "../types";
import { homebrewReviewSnapshotReason } from "./data-state";
import {
  isHandoffISODate,
  isHandoffUUID,
  parseHandoffTarget,
} from "./handoff-contract";

export const HOMEBREW_EVIDENCE_LIFETIME_MS = 900 * 1000;
export const HOMEBREW_EVIDENCE_FUTURE_TOLERANCE_MS = 30 * 1000;

function evidenceFor(
  data: VessloData,
  app: VessloApp,
): HomebrewReadinessEvidence | undefined {
  const matches = data.homebrewReadiness?.filter(
    (evidence) => evidence.target.appId.toLowerCase() === app.id.toLowerCase(),
  );
  if (matches?.length !== 1) return undefined;
  const evidence = matches[0];
  if (
    evidence.evidenceId &&
    data.homebrewReadiness?.filter(
      (candidate) =>
        candidate.evidenceId?.toLowerCase() ===
        evidence.evidenceId?.toLowerCase(),
    ).length !== 1
  )
    return undefined;
  return evidence;
}

/** A positive source event is useful only for the same installed and proposed target. */
export function homebrewTargetReadinessReason(
  data: VessloData,
  app: VessloApp,
  now: number = Date.now(),
): string | null {
  const snapshotReason = homebrewReviewSnapshotReason(data, now);
  if (snapshotReason) return snapshotReason;
  if (data.schemaVersion === 2) return null;
  return targetEvidenceReason(data, app, evidenceFor(data, app), now);
}

function targetEvidenceReason(
  data: VessloData,
  app: VessloApp,
  evidence: HomebrewReadinessEvidence | undefined,
  now: number,
): string | null {
  if (!evidence)
    return "This Homebrew target has no unique current source-check evidence. Run a full check in Vesslo.";
  if (evidence.source !== "homebrew" || evidence.state !== "ready")
    return evidence.state === "failed"
      ? "The selected Homebrew source check failed. Review the source in Vesslo."
      : "The selected Homebrew source has not been verified by the current check.";
  if (!isHandoffUUID(evidence.evidenceId) || evidence.reason != null)
    return "The selected Homebrew source-check evidence is invalid.";
  if (
    evidence.publisherSessionId.toLowerCase() !==
      data.publisherSessionId?.toLowerCase() ||
    evidence.checkRevision !== data.checkRevision ||
    evidence.inventoryRevision !== data.inventoryRevision
  )
    return "The selected Homebrew evidence belongs to another session, check, or inventory. Reload and review the current target.";
  const target = parseHandoffTarget(evidence.target);
  if (
    !target ||
    target.readinessEvidenceId !== undefined ||
    target.appId.toLowerCase() !== app.id.toLowerCase() ||
    target.bundleId !== app.bundleId ||
    target.canonicalPath !== app.path ||
    target.caskToken !== app.homebrewCask ||
    target.installedVersion !== app.version ||
    target.expectedTargetVersion !== app.targetVersion
  )
    return "The selected Homebrew evidence no longer matches this installation, cask, or version.";
  if (
    !isHandoffISODate(evidence.checkedAt) ||
    !isHandoffISODate(evidence.expiresAt) ||
    !isHandoffISODate(data.lastUpdateCheckAt)
  )
    return "The selected Homebrew evidence has invalid source-check timestamps.";
  const checkedAt = Date.parse(evidence.checkedAt);
  const expiresAt = Date.parse(evidence.expiresAt);
  if (
    expiresAt <= checkedAt ||
    expiresAt - checkedAt > HOMEBREW_EVIDENCE_LIFETIME_MS ||
    checkedAt > now + HOMEBREW_EVIDENCE_FUTURE_TOLERANCE_MS ||
    checkedAt >
      Date.parse(data.lastUpdateCheckAt) + HOMEBREW_EVIDENCE_FUTURE_TOLERANCE_MS
  )
    return "The selected Homebrew evidence has inconsistent or future source-check timestamps.";
  if (now >= expiresAt)
    return "The selected Homebrew source-check evidence expired. Run a fresh check in Vesslo.";
  return null;
}

export function homebrewReadinessEvidenceId(
  data: VessloData,
  app: VessloApp,
  now: number = Date.now(),
): string | null {
  if (data.schemaVersion !== 3 || homebrewTargetReadinessReason(data, app, now))
    return null;
  return evidenceFor(data, app)?.evidenceId ?? null;
}

export function homebrewReadinessFingerprint(
  data: VessloData,
  app: VessloApp,
  now: number = Date.now(),
): string | null {
  if (data.schemaVersion !== 3 || homebrewTargetReadinessReason(data, app, now))
    return null;
  const evidence = evidenceFor(data, app)!;
  const target = evidence.target;
  return JSON.stringify([
    target.appId.toLowerCase(),
    target.bundleId,
    target.canonicalPath,
    target.caskToken,
    target.installedVersion,
    target.expectedTargetVersion,
    evidence.source,
    evidence.state,
    evidence.evidenceId?.toLowerCase(),
    evidence.publisherSessionId.toLowerCase(),
    evidence.checkRevision,
    evidence.inventoryRevision,
    Date.parse(evidence.checkedAt!),
    Date.parse(evidence.expiresAt!),
    evidence.reason ?? null,
  ]);
}

/** Recomputed on file polls so expiry updates presentation even without a new export. */
export function readyHomebrewTargetCount(
  data: VessloData,
  now: number = Date.now(),
): number {
  if (data.schemaVersion !== 3 || homebrewReviewSnapshotReason(data, now))
    return 0;
  const evidenceByApp = new Map<
    string,
    HomebrewReadinessEvidence | undefined
  >();
  const evidenceIds = new Map<string, number>();
  for (const evidence of data.homebrewReadiness ?? []) {
    const id = evidence.target.appId.toLowerCase();
    evidenceByApp.set(id, evidenceByApp.has(id) ? undefined : evidence);
    if (evidence.evidenceId) {
      const proofId = evidence.evidenceId.toLowerCase();
      evidenceIds.set(proofId, (evidenceIds.get(proofId) ?? 0) + 1);
    }
  }
  const appIds = new Map<string, number>();
  const casks = new Map<string, number>();
  for (const app of data.apps) {
    const id = app.id.toLowerCase();
    appIds.set(id, (appIds.get(id) ?? 0) + 1);
    if (!app.isDeleted && app.sources.includes("Brew") && app.homebrewCask)
      casks.set(app.homebrewCask, (casks.get(app.homebrewCask) ?? 0) + 1);
  }
  return data.apps.filter(
    (app) =>
      !app.isDeleted &&
      !app.isIgnored &&
      app.currentTargetSkipped === false &&
      app.isVisibleInUpdates === true &&
      app.exportContract === "current" &&
      app.primaryActionKind === "runBrew" &&
      app.eligibilityKind === "executableUpdate.homebrew" &&
      app.sources.includes("Brew") &&
      appIds.get(app.id.toLowerCase()) === 1 &&
      casks.get(app.homebrewCask ?? "") === 1 &&
      evidenceIds.get(
        evidenceByApp.get(app.id.toLowerCase())?.evidenceId?.toLowerCase() ??
          "",
      ) === 1 &&
      targetEvidenceReason(
        data,
        app,
        evidenceByApp.get(app.id.toLowerCase()),
        now,
      ) === null,
  ).length;
}
