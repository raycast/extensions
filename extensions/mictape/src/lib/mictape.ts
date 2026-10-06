import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Destination = { name: string; path: string };

export type Status = {
  recording: boolean;
  path?: string;
  device?: string;
  startedAt?: string;
  elapsed?: number;
  pid?: number;
};

export type Saved = { path: string; duration: number };

export type DestinationRule = { path: string; subdirectory?: string };

export type ConfigInfo = {
  path: string;
  exists: boolean;
  filename: string;
  needsLabel: boolean;
  device?: string;
  destinations: DestinationRule[];
};

export type FilenamePreview = { template: string; example?: string; needsLabel: boolean; error?: string };

export type LevelReport = { meanDB: number; maxDB: number; verdict: "ok" | "quiet" | "silent" };

export const INSTALL_URL = "https://github.com/t4kamuna/mictape/blob/main/README.en.md#install-from-source";

export class MictapeNotFoundError extends Error {
  constructor() {
    super("mictape is not installed");
  }
}

export class MictapeError extends Error {}

const CANDIDATES = [join(homedir(), ".local/bin/mictape"), "/opt/homebrew/bin/mictape", "/usr/local/bin/mictape"];

export function mictapePath(): string {
  const { mictapePath } = getPreferenceValues<Preferences>();
  const configured = mictapePath?.trim().replace(/^~(?=$|\/)/, homedir());
  if (configured) {
    if (existsSync(configured)) return configured;
    throw new MictapeNotFoundError();
  }
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new MictapeNotFoundError();
  return found;
}

/** Runs mictape with --json and parses its output. Errors carry mictape's own message. */
export function run<T>(args: string[], timeoutMs = 30_000): Promise<T> {
  const bin = mictapePath();
  return new Promise((resolve, reject) => {
    execFile(bin, [...args, "--json"], { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new MictapeError(stderr.trim() || error.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        reject(new MictapeError(`Unexpected output from mictape: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

export const getStatus = () => run<Status>(["status"]);
export const getDestinations = () => run<Destination[]>(["destinations"]);
export const getConfig = () => run<ConfigInfo>(["config"]);
export const addDestination = (rule: DestinationRule) =>
  run<ConfigInfo>([
    "config",
    "add-destination",
    rule.path,
    ...(rule.subdirectory ? ["--subdirectory", rule.subdirectory] : []),
  ]);
export const removeDestination = (rule: DestinationRule) =>
  run<ConfigInfo>([
    "config",
    "remove-destination",
    rule.path,
    ...(rule.subdirectory ? ["--subdirectory", rule.subdirectory] : []),
  ]);
export const setFilename = (template: string) => run<ConfigInfo>(["config", "set-filename", template]);
export const previewFilename = (template: string) => run<FilenamePreview>(["config", "preview-filename", template]);
export const startRecording = (destination: string, label?: string) =>
  run<Status>(["start", "--to", destination, ...(label ? ["--label", label] : [])], 60_000);
export const stopRecording = () => run<Saved>(["stop"]);
export const testMicrophone = (seconds: number) =>
  run<LevelReport>(["test", "--seconds", String(seconds)], (seconds + 30) * 1000);

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function elapsedSince(startedAt?: string): number {
  return startedAt ? (Date.now() - new Date(startedAt).getTime()) / 1000 : 0;
}

export function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}
