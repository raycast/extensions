import { environment, getPreferenceValues } from "@raycast/api";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PrinterConfig, streamUrl } from "./config";

/**
 * Raycast runs commands with a minimal PATH that doesn't include Homebrew,
 * so binaries are always resolved to an absolute path.
 */
const MPV_CANDIDATES = ["/opt/homebrew/bin/mpv", "/usr/local/bin/mpv"];
const BREW_CANDIDATES = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];

export const BREW_INSTALL_COMMAND = "brew install mpv";

function isExecutable(file: string): boolean {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function findBinary(name: string, candidates: string[]): string | undefined {
  const fromPath = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((dir) => path.join(dir, name));
  return [...candidates, ...fromPath].find(isExecutable);
}

export function findMpv(): string | undefined {
  return findBinary("mpv", MPV_CANDIDATES);
}

export function findBrew(): string | undefined {
  return findBinary("brew", BREW_CANDIDATES);
}

const SIZES: Record<Preferences["size"], string> = {
  small: "320x180",
  medium: "480x270",
  large: "640x360",
};

const CORNERS: Record<Preferences["corner"], string> = {
  "top-right": "99%:2%",
  "top-left": "1%:2%",
  "bottom-right": "99%:98%",
  "bottom-left": "1%:98%",
};

function mpvArgs(config: PrinterConfig): string[] {
  const prefs = getPreferenceValues<Preferences>();
  const title = prefs.windowTitle?.trim() || "Bambu Live View";
  return [
    "--ontop",
    "--no-border",
    "--no-audio",
    "--no-terminal",
    "--rtsp-transport=tcp",
    "--profile=low-latency",
    `--autofit=${SIZES[prefs.size] ?? SIZES.medium}`,
    `--geometry=${CORNERS[prefs.corner] ?? CORNERS["top-right"]}`,
    // An explicit title also keeps the stream URL (which contains the access code) out of the window title.
    `--title=${title}`,
    streamUrl(config),
  ];
}

// --- Process tracking -------------------------------------------------------

const pidFile = () => path.join(environment.supportPath, "mpv.pid");

function readPid(): number | undefined {
  try {
    const pid = Number(fs.readFileSync(pidFile(), "utf8").trim());
    return Number.isInteger(pid) && pid > 1 ? pid : undefined;
  } catch {
    return undefined;
  }
}

function writePid(pid: number) {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  fs.writeFileSync(pidFile(), String(pid));
}

function clearPid() {
  fs.rmSync(pidFile(), { force: true });
}

function psField(pid: number, field: "comm" | "args"): string | undefined {
  try {
    return execFileSync("/bin/ps", ["-p", String(pid), "-o", `${field}=`], { encoding: "utf8" }).trim();
  } catch {
    return undefined; // ps exits non-zero when the process doesn't exist
  }
}

/**
 * Only trust the stored PID if it still belongs to an mpv process playing a
 * Bambu stream — PIDs get reused, and we must never kill an unrelated process.
 */
function isOurViewer(pid: number): boolean {
  const comm = psField(pid, "comm");
  if (!comm || path.basename(comm) !== "mpv") return false;
  return psField(pid, "args")?.includes("/streaming/live/1") ?? false;
}

/** Returns the PID of the running live view, cleaning up a stale PID file if needed. */
export function runningViewerPid(): number | undefined {
  const pid = readPid();
  if (pid === undefined) return undefined;
  if (isOurViewer(pid)) return pid;
  clearPid();
  return undefined;
}

export function stopViewer(pid: number) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    // Already exited between the check and the kill — nothing to do.
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  } finally {
    clearPid();
  }
}

export function startViewer(mpvPath: string, config: PrinterConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(mpvPath, mpvArgs(config), { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      if (child.pid === undefined) {
        reject(new Error("mpv did not start"));
        return;
      }
      writePid(child.pid);
      resolve(child.pid);
    });
  });
}
