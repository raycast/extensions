import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const HOME = process.env.HOME ?? "";

const SEARCH_PATHS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  `${HOME}/.npm-packages/bin`,
  `${HOME}/.npm/bin`,
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].filter(Boolean);

const PLATFORM_PACKAGES: Record<string, string> = {
  "darwin-arm64": "@ahkohd/omni-darwin-arm64",
  "darwin-x64": "@ahkohd/omni-darwin-x64",
  "linux-x64": "@ahkohd/omni-linux-x64-gnu",
  "win32-x64": "@ahkohd/omni-win32-x64-msvc",
};

type StopMode = "insert" | "copy" | "";

interface Preferences {
  omniBinary?: string;
  stopMode?: StopMode;
}

let resolvedBinary: string | null = null;

// Locate the native binary inside the npm package directly.
// The npm `omni` command is a Node.js wrapper script (#!/usr/bin/env node),
// which Raycast's sandboxed Node runtime can't execute via execFile.
function findNativeBinaryInNpm(): string | null {
  const pkgName = PLATFORM_PACKAGES[`${process.platform}-${process.arch}`];
  if (!pkgName) return null;

  const prefixes = [
    `${HOME}/.npm-packages/lib/node_modules/@ahkohd/omni`,
    `${HOME}/.npm/lib/node_modules/@ahkohd/omni`,
    "/usr/local/lib/node_modules/@ahkohd/omni",
    "/opt/homebrew/lib/node_modules/@ahkohd/omni",
  ].filter(Boolean);

  const binaryName = process.platform === "win32" ? "omni.exe" : "omni";

  for (const prefix of prefixes) {
    const candidate = join(prefix, "node_modules", pkgName, "bin", binaryName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

// Resolve the omni binary: preference > npm native binary > PATH lookup.
export async function findOmniBinary(): Promise<string> {
  if (resolvedBinary) {
    return resolvedBinary;
  }

  const prefs = getPreferenceValues<Preferences>();
  if (prefs.omniBinary?.trim()) {
    resolvedBinary = prefs.omniBinary.trim();
    return resolvedBinary;
  }

  const nativeBinary = findNativeBinaryInNpm();
  if (nativeBinary) {
    resolvedBinary = nativeBinary;
    return resolvedBinary;
  }

  try {
    const env = {
      ...process.env,
      PATH: `${SEARCH_PATHS.join(":")}:${process.env.PATH ?? ""}`,
    };
    const { stdout } = await execFileAsync("/usr/bin/which", ["omni"], {
      env,
      timeout: 3000,
    });
    const path = stdout.trim();
    if (path) {
      resolvedBinary = path;
      return resolvedBinary;
    }
  } catch {
    // Not found.
  }

  throw new Error(
    "Could not find the omni binary.\n\nInstall with: npm install -g @ahkohd/omni\n\nOr set the path in extension preferences.",
  );
}

function execEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${SEARCH_PATHS.join(":")}:${process.env.PATH ?? ""}`,
  };
}

export async function omni<T = unknown>(
  args: string[],
  timeoutMs = 15000,
): Promise<T> {
  const bin = await findOmniBinary();
  const { stdout } = await execFileAsync(bin, [...args, "--json"], {
    timeout: timeoutMs,
    env: execEnv(),
  });

  const output = stdout.trim();
  if (!output) {
    throw new Error(`omni ${args.join(" ")} returned empty output`);
  }

  try {
    return JSON.parse(output) as T;
  } catch {
    throw new Error(
      `Failed to parse omni JSON output for: omni ${args.join(" ")}`,
    );
  }
}

export async function ensureDaemon(): Promise<void> {
  try {
    const status = await omni<DaemonResponse>(["status"]);
    if (status.running) {
      return;
    }
  } catch {
    // Daemon may not be running yet.
  }

  await omni(["start"]);
}

// Response types

export interface DaemonResponse {
  ok: boolean;
  running: boolean;
  recording: boolean;
  pid?: number;
  message?: string;
  transcript?: string;
  transcript_preview?: string;
  transcript_updated_at_ms?: number;
  duration_ms?: number;
  error?: string;
}

export interface TranscribeStatusResponse extends DaemonResponse {}

export interface InputListResponse {
  ok: boolean;
  configuredDevice: string;
  configuredDeviceAvailable: boolean;
  devices: InputDevice[];
}

export interface InputDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isSelected: boolean;
}

export interface InputShowResponse {
  ok: boolean;
  configuredDevice: string;
  configuredDeviceAvailable: boolean;
  activeDevice?: string;
  activeId?: string;
  activeIsDefault: boolean;
  defaultDevice?: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheck[];
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export function getStopMode(): StopMode {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.stopMode ?? "insert";
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
}
