import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_BINARY_PATHS = [
  "/opt/homebrew/bin/smctl",
  "/usr/local/bin/smctl",
];

export const INSTALL_SMCTL_COMMAND = "brew install leaperone/smctl/smctl";
export const INSTALL_DAEMON_COMMAND = "sudo smctl daemon install";

export type FanMode = "auto" | "manual" | string;

export interface Fan {
  readonly index: number;
  readonly actualRPM: number;
  readonly targetRPM: number;
  readonly minimumRPM: number;
  readonly maximumRPM: number;
  readonly mode: FanMode;
}

export interface FanSnapshot {
  readonly fans: readonly Fan[];
  readonly hottestSensorCelsius: number | undefined;
  readonly timestamp: string;
}

export type FanProfile = "auto" | "quiet" | "full";

export class SmctlNotFoundError extends Error {
  constructor() {
    super(`smctl binary not found. Install it with: ${INSTALL_SMCTL_COMMAND}`);
    this.name = "SmctlNotFoundError";
  }
}

export class DaemonNotRunningError extends Error {
  constructor() {
    super(
      `smctld daemon is not running. Install it with: ${INSTALL_DAEMON_COMMAND}`,
    );
    this.name = "DaemonNotRunningError";
  }
}

function resolveBinaryPath(): string {
  const { smctlPath } = getPreferenceValues<Preferences>();
  const candidates = smctlPath?.trim()
    ? [smctlPath.trim()]
    : DEFAULT_BINARY_PATHS;
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new SmctlNotFoundError();
}

async function runSmctl(args: readonly string[]): Promise<string> {
  const binary = resolveBinaryPath();
  try {
    const { stdout } = await execFileAsync(binary, [...args], {
      timeout: 15_000,
    });
    return stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("smctld is not running")) {
      throw new DaemonNotRunningError();
    }
    throw new Error(`smctl ${args.join(" ")} failed: ${message}`);
  }
}

function parseFan(raw: unknown, position: number): Fan {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(
      `Unexpected fan entry at position ${position} in smctl output`,
    );
  }
  const record = raw as Record<string, unknown>;
  const numeric = (field: string): number => {
    const value = record[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `Fan field "${field}" missing or not a number in smctl output`,
      );
    }
    return value;
  };
  return {
    index: numeric("index"),
    actualRPM: numeric("actualRPM"),
    targetRPM: numeric("targetRPM"),
    minimumRPM: numeric("minimumRPM"),
    maximumRPM: numeric("maximumRPM"),
    mode: typeof record.mode === "string" ? record.mode : "unknown",
  };
}

function parseHottestSensor(temperatures: unknown): number | undefined {
  if (!Array.isArray(temperatures)) {
    return undefined;
  }
  const readings = temperatures
    .map((entry) =>
      typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>).celsius
        : undefined,
    )
    .filter(
      (celsius): celsius is number =>
        typeof celsius === "number" && celsius > 0,
    );
  return readings.length > 0 ? Math.max(...readings) : undefined;
}

/**
 * Reads fans and temperatures via `smctl sensors --json`.
 * This is the read path: it needs neither the daemon nor root.
 */
export async function getFanSnapshot(): Promise<FanSnapshot> {
  const stdout = await runSmctl(["sensors", "--json"]);
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Unexpected smctl sensors output: not a JSON object");
  }
  const record = parsed as Record<string, unknown>;
  const rawFans = Array.isArray(record.fans) ? record.fans : [];
  return {
    fans: rawFans.map(parseFan),
    hottestSensorCelsius: parseHottestSensor(record.temperatures),
    timestamp:
      typeof record.timestamp === "string"
        ? record.timestamp
        : new Date().toISOString(),
  };
}

/**
 * Sets a manual RPM target. Requires the smctld daemon (writes go through it).
 * When fanIndex is omitted, all fans get the same target.
 */
export async function setFanSpeed(
  rpm: number,
  fanIndex?: number,
): Promise<void> {
  if (!Number.isInteger(rpm) || rpm < 0) {
    throw new Error(`Invalid RPM value: ${rpm}`);
  }
  const fanArgs = fanIndex === undefined ? [] : ["--fan", String(fanIndex)];
  await runSmctl(["fan", "set", String(rpm), ...fanArgs]);
}

/** Applies a fan profile. "auto" returns control to macOS. Requires the daemon. */
export async function setFanProfile(profile: FanProfile): Promise<void> {
  await runSmctl(["fan", "profile", profile]);
}

export function formatRPM(rpm: number): string {
  return `${Math.round(rpm).toLocaleString("en-US")} RPM`;
}

export interface RPMRange {
  readonly min: number;
  readonly max: number;
}

/**
 * The RPM range a request must satisfy: the selected fan's own range, or the
 * intersection of every fan's range when targeting all fans. Returns undefined
 * when no fans are known (nothing to validate against).
 */
export function allowedRange(
  fans: readonly Fan[],
  fanIndex?: number,
): RPMRange | undefined {
  const targeted =
    fanIndex === undefined
      ? fans
      : fans.filter((fan) => fan.index === fanIndex);
  if (targeted.length === 0) {
    return undefined;
  }
  return {
    min: Math.max(...targeted.map((fan) => fan.minimumRPM)),
    max: Math.min(...targeted.map((fan) => fan.maximumRPM)),
  };
}
