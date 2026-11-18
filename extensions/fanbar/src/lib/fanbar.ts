import { accessSync, constants } from "node:fs";
import { execFile } from "node:child_process";
import { getPreferenceValues } from "@raycast/api";

// Mirrors FanBarCLIResponse in Sources/FanBarShared/FanBarCLIContract.swift.
export interface FanBarResponse {
  ok: boolean;
  message: string;
  status?: FanBarStatus;
  presets?: FanBarPreset[];
  appPath?: string;
}

export interface FanBarStatus {
  mode: "automatic" | "curve" | "fixed";
  /** Token of the preset whose curve is selected (active only in `curve`). */
  preset: string;
  presetName: string;
  fixedRPM?: number;
  curveOutputPercent?: number;
  /** ISO 8601. Absent in `automatic` or when held. */
  restoresAt?: string;
  helperEnabled: boolean;
  fans: FanBarFan[];
  cpuCelsius?: number;
  gpuCelsius?: number;
  ssdCelsius?: number;
}

export interface FanBarFan {
  index: number;
  currentRPM: number;
  minimumRPM: number;
  maximumRPM: number;
}

export interface FanBarPreset {
  /** Token accepted by `fanbar preset set` (`builtin:2`, `custom:<uuid>`). */
  id: string;
  /** Stable English key for built-ins, the user's name otherwise. */
  key: string;
  name: string;
  builtIn: boolean;
  selected: boolean;
}

/**
 * Why a call failed. `refused`, `usage` and `unreachable` are the CLI's exit
 * codes 1, 2 and 3; `missing` means no `fanbar` was found at all.
 */
export type FanBarFailure = "missing" | "refused" | "usage" | "unreachable" | "unexpected";

export class FanBarError extends Error {
  constructor(
    readonly failure: FanBarFailure,
    message: string,
  ) {
    super(message);
    this.name = "FanBarError";
  }

  /** Short toast title; the message carries the CLI's own wording. */
  get title(): string {
    switch (this.failure) {
      case "missing":
        return "fanbar not found";
      case "refused":
        return "FanBar refused the command";
      case "usage":
        return "fanbar did not understand the command";
      case "unreachable":
        return "FanBar could not be reached";
      case "unexpected":
        return "fanbar failed";
    }
  }
}

// Raycast does not load the shell profile, so look in the places the Settings
// link, Homebrew and the app bundle put the tool, like the Script Commands do.
export const DEFAULT_LOCATIONS = [
  "/usr/local/bin/fanbar",
  "/opt/homebrew/bin/fanbar",
  "/Applications/FanBar.app/Contents/Helpers/fanbar",
];

export const DOCS_URL = "https://github.com/helson-lin/FanBar/blob/main/docs/cli.md";
export const INSTALL_COMMAND =
  "sudo mkdir -p /usr/local/bin && sudo ln -sf /Applications/FanBar.app/Contents/Helpers/fanbar /usr/local/bin/fanbar";

// Must outlast fanbar's worst case, or Raycast kills it while a switch is still
// being applied: launch wait 20 s (CLIConnection.launchConnectTimeout) + reply
// timeout 117 s (FanBarCLIContract.replyTimeout = commandTimeout 102 s + 15 s,
// commandTimeout = 10 s + 8 fans × 11.5 s) = 137 s, plus 13 s of margin.
// RaycastExtensionTimeoutTests keeps this in step with the Swift constants.
const TIMEOUT_MS = 150_000;

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The first executable `fanbar`: the preference, then the default locations. */
export function findFanBar(): string | undefined {
  const custom = getPreferenceValues<Preferences>().fanbarPath?.trim();
  const candidates = custom ? [custom, ...DEFAULT_LOCATIONS] : DEFAULT_LOCATIONS;
  return candidates.find(isExecutable);
}

export interface RunOptions {
  /** Fail with `unreachable` instead of starting FanBar when it is not running. */
  noLaunch?: boolean;
  /** Keep the new mode until changed (`preset set`, `mode curve`, `mode fixed`). */
  hold?: boolean;
}

/**
 * Runs `fanbar <args> --json` and returns the app's reply when it succeeded.
 * Throws `FanBarError` otherwise.
 */
export function runFanBar(args: string[], options: RunOptions = {}): Promise<FanBarResponse> {
  const tool = findFanBar();
  if (!tool) {
    return Promise.reject(
      new FanBarError("missing", "Install it in FanBar Settings › General › Command Line & Automation."),
    );
  }
  const fullArgs = [...args, "--json"];
  if (options.hold) fullArgs.push("--hold");
  if (options.noLaunch) fullArgs.push("--no-launch");

  return new Promise((resolve, reject) => {
    execFile(tool, fullArgs, { timeout: TIMEOUT_MS, encoding: "utf8" }, (error, stdout, stderr) => {
      // Exit codes 0 and 1 carry the app's JSON reply on stdout; 2 and 3 only
      // a message on stderr.
      const reply = parseReply(stdout);
      const detail = cliMessage(stderr);
      if (!error) {
        if (reply?.ok) return resolve(reply);
        return reject(new FanBarError("unexpected", detail ?? "fanbar printed no reply."));
      }
      if (error.killed) {
        return reject(new FanBarError("unreachable", "fanbar did not answer in time."));
      }
      switch (error.code) {
        case 1:
          return reject(new FanBarError("refused", reply?.message || detail || "FanBar did not apply the change."));
        case 2:
          return reject(new FanBarError("usage", detail ?? "Usage error."));
        case 3:
          return reject(new FanBarError("unreachable", detail ?? "Is FanBar running?"));
        case "ENOENT":
        case "EACCES":
          return reject(new FanBarError("missing", `${tool} could not be run.`));
        default:
          return reject(new FanBarError("unexpected", detail ?? error.message));
      }
    });
  });
}

function parseReply(stdout: string): FanBarResponse | undefined {
  try {
    const value = JSON.parse(stdout) as FanBarResponse;
    return typeof value?.ok === "boolean" ? value : undefined;
  } catch {
    return undefined;
  }
}

/** The CLI's own message: its last "fanbar: " line (usage text follows a usage error). */
function cliMessage(stderr: string): string | undefined {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const message = lines.filter((line) => line.startsWith("fanbar: ")).at(-1) ?? lines.at(-1);
  return message?.replace(/^fanbar: /, "");
}

export function asFanBarError(error: unknown): FanBarError {
  if (error instanceof FanBarError) return error;
  return new FanBarError("unexpected", error instanceof Error ? error.message : String(error));
}

/**
 * The range every fan accepts: the highest minimum to the lowest maximum, so a
 * fixed RPM inside it is valid for all of them.
 */
export function sharedRange(fans: FanBarFan[]): { min: number; max: number } | undefined {
  if (fans.length === 0) return undefined;
  const min = Math.max(...fans.map((fan) => fan.minimumRPM));
  const max = Math.min(...fans.map((fan) => fan.maximumRPM));
  return min <= max ? { min, max } : undefined;
}

export function formatRPM(value: number): string {
  return `${value.toLocaleString("en-US")} RPM`;
}

export function formatCelsius(value: number): string {
  return `${Math.round(value)}°C`;
}

export function modeLabel(status: FanBarStatus): string {
  switch (status.mode) {
    case "automatic":
      return "Automatic (macOS)";
    case "curve":
      return `Preset ${status.presetName}`;
    case "fixed":
      return status.fixedRPM === undefined ? "Fixed" : `Fixed ${formatRPM(status.fixedRPM)}`;
  }
}

/** "macOS control returns at 14:30", "Held until changed", or undefined in automatic mode. */
export function restoreLabel(status: FanBarStatus): string | undefined {
  if (status.mode === "automatic") return undefined;
  if (!status.restoresAt) return "Held until changed";
  const date = new Date(status.restoresAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return `macOS control returns at ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}
