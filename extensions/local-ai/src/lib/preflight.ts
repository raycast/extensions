import { LICENSE_MESSAGE, NOT_INSTALLED_MESSAGE, UNAVAILABLE_MESSAGE } from "./fm/errors";
import type { ProbeResult } from "./fm/process";

export type PreflightCheckId = "binary" | "license" | "available";

export interface PreflightCheck {
  id: PreflightCheckId;
  status: "ok" | "failed" | "skipped";
  title: string;
  message: string;
}

export interface PreflightResult {
  ok: boolean;
  checks: PreflightCheck[];
  firstFailure?: PreflightCheckId;
}

export interface PreflightProbes {
  binaryExists: boolean;
  license?: ProbeResult;
  available?: ProbeResult;
}

export const PREFLIGHT_CACHE_TTL_MS = 300_000;

const TITLES: Record<PreflightCheckId, string> = {
  binary: "Foundation Models CLI",
  license: "Model License",
  available: "Apple Intelligence",
};

const FAILED_MESSAGES: Record<PreflightCheckId, string> = {
  binary: NOT_INSTALLED_MESSAGE,
  license: LICENSE_MESSAGE,
  available: UNAVAILABLE_MESSAGE,
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
    available: probes.available && isModelAvailable(probes.available),
  };

  const checks: PreflightCheck[] = [];
  let firstFailure: PreflightCheckId | undefined;
  for (const id of ["binary", "license", "available"] as const) {
    if (firstFailure !== undefined) {
      checks.push(buildCheck(id, "skipped", ""));
    } else if (passed[id]) {
      checks.push(buildCheck(id, "ok", OK_MESSAGES[id]));
    } else {
      firstFailure = id;
      checks.push(buildCheck(id, "failed", FAILED_MESSAGES[id]));
    }
  }

  return { ok: firstFailure === undefined, checks, ...(firstFailure !== undefined && { firstFailure }) };
}

export function isPreflightCacheFresh(checkedAt: number, now: number): boolean {
  return now - checkedAt < PREFLIGHT_CACHE_TTL_MS;
}

function buildCheck(id: PreflightCheckId, status: PreflightCheck["status"], message: string): PreflightCheck {
  return { id, status, title: TITLES[id], message };
}

function isLicenseAgreed(probe: ProbeResult): boolean {
  return probe.exitCode === 0 && probe.stdout.startsWith("Agreed");
}

function isModelAvailable(probe: ProbeResult): boolean {
  return probe.exitCode === 0 && /System model available/i.test(probe.stdout);
}
