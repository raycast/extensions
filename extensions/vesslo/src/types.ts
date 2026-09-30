import type { HandoffTarget } from "./utils/handoff-contract";

// Vesslo app data types
export type ExportContract = "current" | "legacy" | "unsupported";

export const PRIMARY_ACTION_KINDS = [
  "runBrew",
  "runSparkle",
  "runAppStore",
  "openInstaller",
  "openAppStore",
  "adoptAndUpdate",
  "refreshRequired",
  "none",
] as const;
export type PrimaryActionKind =
  | (typeof PRIMARY_ACTION_KINDS)[number]
  | "unknown";

export const ELIGIBILITY_KINDS = [
  "none",
  "executableUpdate.homebrew",
  "executableUpdate.sparkle",
  "executableUpdate.appStore",
  "executableUpdate.setapp",
  "executableUpdate.manual",
  "manualInstallerUpdate",
  "appStoreManualUpdate",
  "adoptionCandidate.homebrew",
  "adoptionCandidate.sparkle",
  "adoptionCandidate.appStore",
  "adoptionCandidate.setapp",
  "adoptionCandidate.manual",
  "reviewRequiredCandidate",
  "skippedCurrentTarget",
  "ignored",
  "unsupported",
] as const;
export type EligibilityKind = (typeof ELIGIBILITY_KINDS)[number] | "unknown";

export interface VessloApp {
  id: string;
  name: string;
  bundleId: string | null;
  version: string | null;
  targetVersion: string | null;
  developer: string | null;
  path: string;
  icon: string | null; // Base64 encoded PNG
  tags: string[];
  memo: string | null;
  sources: string[];
  appStoreId: string | null;
  homebrewCask: string | null;
  isVisibleInUpdates: boolean | null;
  eligibilityKind: EligibilityKind | null;
  primaryActionKind: PrimaryActionKind | null;
  rawEligibilityKind?: string | null;
  rawPrimaryActionKind?: string | null;
  exportContract: ExportContract;
  currentTargetSkipped: boolean | null;
  hasAnySkippedVersion: boolean | null;
  auditGroups: string[];
  securityReasons: string[];
  managementReasons: string[];
  updateHealthStatus: string | null;
  updateHealthReasons: string[];
  lastUpdateSourceAttemptAt: string | null;
  lastUpdateSourceSuccessAt: string | null;
  updateHealthSource: string | null;
  updateHealthSourceIdentity: string | null;
  updateHealthSuppressedUntil: string | null;
  isDeleted: boolean;
  isSkipped: boolean;
  isIgnored: boolean;
}

export type ExportCheckPhase = "unverified" | "checking" | "ready" | "failed";

export interface HomebrewReadinessEvidence {
  target: HandoffTarget;
  source: "homebrew";
  state: "ready" | "failed" | "unverified";
  evidenceId?: string;
  publisherSessionId: string;
  checkRevision: number;
  inventoryRevision: number;
  checkedAt?: string;
  expiresAt?: string;
  reason?: string;
}

export interface VessloData {
  schemaVersion?: 2 | 3;
  producerVersion?: string;
  producerBuild?: string;
  publisherSessionId?: string;
  inventoryRevision?: number;
  exportRevision?: number;
  checkPhase?: ExportCheckPhase;
  checkRevision?: number;
  completedCheckRevision?: number;
  completedInventoryRevision?: number;
  checkedInventoryRevision?: number;
  lastUpdateCheckAt?: string;
  checkReason?: string;
  capabilities?: string[];
  homebrewReadiness?: HomebrewReadinessEvidence[];
  exportedAt: string;
  updateCount: number | null;
  apps: VessloApp[];
}
