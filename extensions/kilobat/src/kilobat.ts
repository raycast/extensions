import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

export const APP_URL = "https://kilobat.app";
export const BREW_INSTALL = "brew install seifip/kilobat/kilobat";

export class MissingCLIError extends Error {
  constructor() {
    super("Kilobat CLI not found");
  }
}

export function cliPath(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  if (cliPath?.trim()) {
    if (existsSync(cliPath.trim())) return cliPath.trim();
    throw new MissingCLIError();
  }
  const found = ["/opt/homebrew/bin/kilobat", "/usr/local/bin/kilobat", `${homedir()}/.local/bin/kilobat`].find(
    (path) => existsSync(path),
  );
  if (!found) throw new MissingCLIError();
  return found;
}

/** Runs the CLI and parses its JSON. Commands like `why` exit 1 on a failed check but still print JSON. */
export function kilobat<T>(args: string[], timeoutMs = 30_000): Promise<T> {
  return new Promise((resolve, reject) => {
    let path: string;
    try {
      path = cliPath();
    } catch (error) {
      return reject(error);
    }
    execFile(path, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        reject(new Error((stderr || error?.message || "Kilobat returned no result.").trim()));
      }
    });
  });
}

/** Runs a CLI command that prints text, not JSON, such as `settings <key> <value>`; fails when it exits non-zero. */
export function kilobatRun(args: string[], timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let path: string;
    try {
      path = cliPath();
    } catch (error) {
      return reject(error);
    }
    execFile(path, args, { timeout: timeoutMs }, (error, stdout, stderr) =>
      error ? reject(new Error((stderr || error.message).trim())) : resolve(stdout.trim()),
    );
  });
}

/** Like `kilobat`, but reports each line the CLI prints to stderr (its progress) as it arrives. */
export function kilobatStreaming<T>(
  args: string[],
  onProgress: (line: string) => void,
  timeoutMs = 120_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let path: string;
    try {
      path = cliPath();
    } catch (error) {
      return reject(error);
    }
    const child = spawn(path, args);
    const timer = setTimeout(() => child.kill(), timeoutMs);
    let stdout = "",
      stderr = "",
      pending = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      pending += chunk;
      const parts = pending.split("\n");
      pending = parts.pop() ?? "";
      parts.filter((line) => line.trim()).forEach((line) => onProgress(line.trim()));
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        reject(new Error(stderr.trim().split("\n").pop() || "Kilobat returned no result."));
      }
    });
  });
}

export { formatBytes, formatRate } from "./format";

export interface NetworkApp {
  id: string;
  name: string;
  /** The app a helper belongs to, as the app's list groups them. */
  groupID?: string;
  groupName?: string;
  groupPath?: string;
  bundlePath?: string;
  /** Set on a group: the processes in it. */
  members?: NetworkApp[];
  downloadBytesPerSecond: number;
  uploadBytesPerSecond: number;
  sessionBytes: number;
  processIDs: number[];
}

export interface Status {
  apps: NetworkApp[];
}

export interface WiFi {
  powered: boolean;
  ssid?: string;
  rssi?: number;
  noise?: number;
  score?: number;
  band?: string;
  channel?: number;
  transmitMbps?: number;
  interface?: string;
}

export interface Conditions {
  advice?: string;
  connected: boolean;
  network?: string;
  interface?: string;
  internetLatencyMs?: number | null;
  internetLossPercent?: number | null;
  metered: boolean;
  lowDataMode: boolean;
  vpn: boolean;
  vpnName?: string | null;
  keptAwake: boolean;
  awakeReasons?: string[];
  awakeUntil?: string | null;
  power?: { batteryPercent?: number | null; onAC: boolean; lowPowerMode: boolean; thermal: string };
}

export interface WhyStep {
  layer: string;
  status: "ok" | "failed" | "warning" | "skipped" | string;
  detail: string;
}

export interface WhyReport {
  ok: boolean;
  host: string;
  target: string;
  verdict: string;
  next?: string;
  steps: WhyStep[];
}

export interface SpeedTest {
  downloadMbps?: number;
  uploadMbps?: number;
  bufferbloat?: string;
  addedLatencyMs?: number;
  idleLatencyMs?: number;
  jitterMs?: number;
  /** How coding agents will fare: Smooth, Sluggish or May stall. */
  agents?: string;
  voiceCalls?: string;
  videoCalls?: string;
  streaming?: string;
  callWarnings?: string[];
  method?: string;
  measurements?: {
    downloadMbps?: number;
    uploadMbps?: number;
    server?: string;
    streams?: number;
    transferredBytes?: number;
    baseline?: { samples?: number[]; lossPercent?: number };
    context?: { kind?: string; band?: string; interface?: string };
  };
}
