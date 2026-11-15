import { execFile, type ExecFileOptions } from "child_process";

const VERSION_TIMEOUT_MS = 5000;
const VERSION_MAX_BUFFER_BYTES = 4096;
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;
const PLAIN_VERSION_PATTERN = /\bv?(\d+\.\d+\.\d+)\b/;

export type VersionStatus = "up-to-date" | "update-available" | "unknown";

interface ExecFileResult {
  stdout: string;
  error: Error | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function outputString(output: unknown): string {
  return typeof output === "string" ? output : String(output ?? "");
}

function execFileUtf8(file: string, args: string[], options: ExecFileOptions): Promise<ExecFileResult> {
  return new Promise((resolve) => {
    try {
      execFile(file, args, options, (error, stdout) => {
        resolve({ stdout: outputString(stdout), error: error as Error | null });
      });
    } catch (error) {
      resolve({ stdout: "", error: error as Error });
    }
  });
}

/** Strip a leading `v` and accept only `major.minor.patch`. */
export function normalizeVersion(value: string): string | null {
  const match = value.trim().match(VERSION_PATTERN);
  if (!match) return null;
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

/** Negative when `left` is older, positive when newer, null when either side is unusable. */
export function compareVersions(left: string, right: string): number | null {
  const leftVersion = normalizeVersion(left);
  const rightVersion = normalizeVersion(right);
  if (!leftVersion || !rightVersion) return null;
  const leftParts = leftVersion.split(".").map(Number);
  const rightParts = rightVersion.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] < rightParts[index] ? -1 : 1;
  }
  return 0;
}

export function resolveVersionStatus(installed: string | null, latest: string | null): VersionStatus {
  if (!installed || !latest) return "unknown";
  const comparison = compareVersions(installed, latest);
  if (comparison === null) return "unknown";
  return comparison < 0 ? "update-available" : "up-to-date";
}

export function meetsMinimumVersion(installed: string | null, minimum: string): boolean | null {
  if (!installed) return null;
  const comparison = compareVersions(installed, minimum);
  if (comparison === null) return null;
  return comparison >= 0;
}

function parseJsonVersion(stdout: string): string | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (!isRecord(parsed)) return null;
    if (parsed.result !== "ok") return null;
    if (typeof parsed.version !== "string") return null;
    return normalizeVersion(parsed.version);
  } catch {
    return null;
  }
}

function parsePlainVersion(stdout: string): string | null {
  const match = stdout.trim().match(PLAIN_VERSION_PATTERN);
  return match ? normalizeVersion(match[1]) : null;
}

async function runVersionCommand(cliPath: string, args: string[]): Promise<string | null> {
  const { stdout, error } = await execFileUtf8(cliPath, args, {
    timeout: VERSION_TIMEOUT_MS,
    maxBuffer: VERSION_MAX_BUFFER_BYTES,
    encoding: "utf-8",
  });
  if (error) return null;
  return stdout;
}

/**
 * Read the installed helper version. Prefer `--version --json`; fall back to
 * plain `--version` for older helpers. Never throws.
 */
export async function readInstalledVersion(cliPath: string): Promise<string | null> {
  const jsonOutput = await runVersionCommand(cliPath, ["--version", "--json"]);
  const jsonVersion = jsonOutput ? parseJsonVersion(jsonOutput) : null;
  if (jsonVersion) return jsonVersion;
  const plainOutput = await runVersionCommand(cliPath, ["--version"]);
  return plainOutput ? parsePlainVersion(plainOutput) : null;
}
