import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { environment, getPreferenceValues } from "@raycast/api";
import type { StatusReport } from "./models";

const execFileAsync = promisify(execFile);

export async function loadStatusReport(): Promise<StatusReport> {
  const preferences = getPreferenceValues<Preferences>();
  const cliPath = resolveCliPath(preferences.cliPath);
  const timeoutSeconds = parseTimeout(preferences.timeoutSeconds);

  const { stdout } = await execFileAsync(cliPath, ["status", "--json"], {
    timeout: timeoutSeconds * 1000,
    maxBuffer: 1024 * 1024 * 8,
  });

  return parseStatusReport(stdout);
}

export function resolveCliPath(preferencePath: string | undefined): string {
  const trimmedPreference = preferencePath?.trim();
  if (trimmedPreference) {
    return trimmedPreference;
  }

  if (process.env.FP_PROGRESS_BIN) {
    return process.env.FP_PROGRESS_BIN;
  }

  return path.join(environment.assetsPath, "bin", "fp-progress");
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 30;
}

function parseStatusReport(stdout: string): StatusReport {
  const parsed: unknown = JSON.parse(stdout);

  if (!isStatusReport(parsed)) {
    throw new Error("fp-progress returned JSON with an unexpected shape.");
  }

  return parsed;
}

function isStatusReport(value: unknown): value is StatusReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { observedAt?: unknown; domains?: unknown };
  return (
    typeof candidate.observedAt === "string" &&
    Array.isArray(candidate.domains) &&
    candidate.domains.every(isDomainSnapshot)
  );
}

function isDomainSnapshot(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const d = value as Record<string, unknown>;
  return (
    typeof d["providerId"] === "string" &&
    typeof d["domainId"] === "string" &&
    typeof d["displayName"] === "string" &&
    typeof d["rootPath"] === "string" &&
    typeof d["observedAt"] === "string" &&
    typeof d["health"] === "object" &&
    d["health"] !== null
  );
}
