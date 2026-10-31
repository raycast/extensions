// Copied from badge-count-raycast src/lib/helper-output.ts on 2026-09-30, unchanged except this header
// Pure mapping from one helper run to a DockRead (SPEC.md sections 5.4 and 8).
import type { DockApp, DockRead, ReadFailure } from "./badge";

/** Raw facts about one helper run, gathered by run-helper.ts. */
export type HelperRun = {
  helperPath: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  /** Node spawn error code such as ENOENT or EACCES, when the process never ran. */
  spawnErrorCode: string | null;
  stdout: string;
  stderr: string;
  elapsedMs: number;
  /** True when the executable bit was missing and was set before running. */
  repairedMode: boolean;
};

export const EXIT_OK = 0;
export const EXIT_NOT_TRUSTED = 10;
export const EXIT_DOCK_NOT_RUNNING = 11;
export const EXIT_DOCK_UNREADABLE = 12;

export const REASONS: Record<ReadFailure, string> = {
  permission: "Accessibility access is off for Raycast",
  "helper-missing": "Helper not found",
  "helper-not-executable": "Helper not executable",
  timeout: "Dock read timed out",
  "dock-not-running": "Dock is not running",
  "dock-unrecognised": "Dock layout not recognised",
  "helper-error": "Dock read failed",
  "unsupported-architecture": "Requires a Mac with Apple silicon",
};

export function diagnostic(run: HelperRun): string {
  return [
    `helper: ${run.helperPath}`,
    `exit: ${run.exitCode}`,
    `signal: ${run.signal}`,
    `timedOut: ${run.timedOut}`,
    `spawnError: ${run.spawnErrorCode}`,
    `repairedMode: ${run.repairedMode}`,
    `elapsedMs: ${run.elapsedMs}`,
    `stdout: ${run.stdout.trim().slice(0, 2000)}`,
    `stderr: ${run.stderr.trim().slice(0, 2000)}`,
  ].join("\n");
}

/**
 * The helper is built for arm64 only (SPEC-STORE.md D2). On any other
 * architecture the read fails before the helper runs, with a clear reason.
 */
export function architectureFailure(arch: string): DockRead | undefined {
  if (arch === "arm64") return undefined;
  const failure: ReadFailure = "unsupported-architecture";
  return { ok: false, failure, reason: REASONS[failure], diagnostic: `arch: ${arch}\nhelper: not run` };
}

function failed(failure: ReadFailure, run: HelperRun): DockRead {
  return { ok: false, failure, reason: REASONS[failure], diagnostic: diagnostic(run) };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/** Validate the success payload against the section 5.4 contract. */
export function parseApps(stdout: string): DockApp[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const { trusted, apps } = parsed as { trusted?: unknown; apps?: unknown };
  if (trusted !== true || !Array.isArray(apps)) return undefined;
  const result: DockApp[] = [];
  for (const entry of apps) {
    if (typeof entry !== "object" || entry === null) return undefined;
    const { bundleId, path, title, running, badge } = entry as Record<string, unknown>;
    if (!isNullableString(bundleId) || !isNullableString(path) || !isNullableString(title)) return undefined;
    if (typeof running !== "boolean" || !isNullableString(badge)) return undefined;
    result.push({ bundleId, path, title, running, badge });
  }
  return result;
}

export function interpretHelperRun(run: HelperRun): DockRead {
  if (run.spawnErrorCode === "ENOENT") return failed("helper-missing", run);
  if (run.spawnErrorCode === "EACCES") return failed("helper-not-executable", run);
  if (run.timedOut) return failed("timeout", run);
  if (run.spawnErrorCode) return failed("helper-error", run);
  switch (run.exitCode) {
    case EXIT_OK: {
      const apps = parseApps(run.stdout);
      return apps ? { ok: true, apps } : failed("dock-unrecognised", run);
    }
    case EXIT_NOT_TRUSTED:
      return failed("permission", run);
    case EXIT_DOCK_NOT_RUNNING:
      return failed("dock-not-running", run);
    case EXIT_DOCK_UNREADABLE:
      return failed("dock-unrecognised", run);
    default:
      return failed("helper-error", run);
  }
}
