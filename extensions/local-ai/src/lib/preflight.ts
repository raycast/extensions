import {
  DEVICE_NOT_ELIGIBLE_MESSAGE,
  LICENSE_MESSAGE,
  MODEL_NOT_READY_MESSAGE,
  MODEL_UNAVAILABLE_MESSAGE,
  NOT_INSTALLED_MESSAGE,
  UNAVAILABLE_MESSAGE,
} from "./fm/errors";
import type { ProbeResult } from "./fm/process";
import { isRecord } from "./versioned-store";

export type PreflightCheckId = "binary" | "license" | "available";

export interface PreflightCheck {
  id: PreflightCheckId;
  status: "ok" | "failed" | "skipped";
  title: string;
  message: string;
  reason?: ModelUnavailableReason;
}

export interface PreflightResult {
  ok: boolean;
  checks: PreflightCheck[];
  firstFailure?: PreflightCheckId;
}

const SYSTEM_UNAVAILABLE_REASONS = [
  "appleIntelligenceNotEnabled",
  "deviceNotEligible",
  "modelNotReady",
  "unknown",
] as const;

export type ModelUnavailableReason = (typeof SYSTEM_UNAVAILABLE_REASONS)[number];

export type ModelAvailability =
  { status: "available" } | { status: "unavailable"; reason: ModelUnavailableReason } | { status: "undetermined" };

export interface PreflightProbes {
  binaryExists: boolean;
  license?: ProbeResult;
  available?: ModelAvailability;
}

export const PREFLIGHT_CACHE_TTL_MS = 300_000;

const UNDETERMINED: ModelAvailability = { status: "undetermined" };

const SETTINGS_FIXABLE_REASONS: readonly ModelUnavailableReason[] = ["appleIntelligenceNotEnabled", "unknown"];

const UNDETERMINED_OK_MESSAGE = "Could not confirm Apple Intelligence. Local AI will tell you if a command cannot run.";

const TITLES: Record<PreflightCheckId, string> = {
  binary: "Foundation Models CLI",
  license: "Model License",
  available: "Apple Intelligence",
};

const FAILED_MESSAGES: Record<PreflightCheckId, string> = {
  binary: NOT_INSTALLED_MESSAGE,
  license: LICENSE_MESSAGE,
  available: MODEL_UNAVAILABLE_MESSAGE,
};

const UNAVAILABLE_REASON_MESSAGES: Record<ModelUnavailableReason, string> = {
  appleIntelligenceNotEnabled: UNAVAILABLE_MESSAGE,
  deviceNotEligible: DEVICE_NOT_ELIGIBLE_MESSAGE,
  modelNotReady: MODEL_NOT_READY_MESSAGE,
  unknown: MODEL_UNAVAILABLE_MESSAGE,
};

const OK_MESSAGES: Record<PreflightCheckId, string> = {
  binary: "Installed",
  license: "License agreed",
  available: "On-device model is available",
};

export function evaluatePreflight(probes: PreflightProbes): PreflightResult {
  const passed: Record<PreflightCheckId, boolean | undefined> = {
    binary: probes.binaryExists,
    license: probes.license && isLicenseAgreed(probes.license),
    available: probes.available && probes.available.status !== "unavailable",
  };

  const checks: PreflightCheck[] = [];
  let firstFailure: PreflightCheckId | undefined;
  for (const id of ["binary", "license", "available"] as const) {
    if (firstFailure !== undefined) {
      checks.push(buildCheck(id, "skipped", ""));
    } else if (passed[id]) {
      checks.push(buildCheck(id, "ok", okMessage(id, probes.available)));
    } else {
      firstFailure = id;
      checks.push(buildCheck(id, "failed", failedMessage(id, probes.available), failedReason(id, probes.available)));
    }
  }

  return { ok: firstFailure === undefined, checks, ...(firstFailure !== undefined && { firstFailure }) };
}

export function parseModelAvailability(raw: unknown): ModelAvailability {
  if (!isRecord(raw)) return UNDETERMINED;
  const { status, reason } = raw;
  if (status === "available") return { status };
  if (status === "unavailable" && isSystemUnavailableReason(reason)) return { status, reason };
  return UNDETERMINED;
}

export function canOpenSettingsFor(reason?: ModelUnavailableReason): boolean {
  return reason === undefined || SETTINGS_FIXABLE_REASONS.includes(reason);
}

export function isPreflightCacheFresh(checkedAt: number, now: number): boolean {
  return now - checkedAt < PREFLIGHT_CACHE_TTL_MS;
}

function buildCheck(
  id: PreflightCheckId,
  status: PreflightCheck["status"],
  message: string,
  reason?: ModelUnavailableReason,
): PreflightCheck {
  return { id, status, title: TITLES[id], message, ...(reason !== undefined && { reason }) };
}

function okMessage(id: PreflightCheckId, available?: ModelAvailability): string {
  if (id === "available" && available?.status === "undetermined") return UNDETERMINED_OK_MESSAGE;
  return OK_MESSAGES[id];
}

function failedMessage(id: PreflightCheckId, available?: ModelAvailability): string {
  if (id === "available" && available?.status === "unavailable") return UNAVAILABLE_REASON_MESSAGES[available.reason];
  return FAILED_MESSAGES[id];
}

function failedReason(id: PreflightCheckId, available?: ModelAvailability): ModelUnavailableReason | undefined {
  return id === "available" && available?.status === "unavailable" ? available.reason : undefined;
}

function isLicenseAgreed(probe: ProbeResult): boolean {
  return probe.exitCode === 0 && probe.stdout.startsWith("Agreed");
}

function isSystemUnavailableReason(reason: unknown): reason is ModelUnavailableReason {
  return SYSTEM_UNAVAILABLE_REASONS.includes(reason as ModelUnavailableReason);
}
