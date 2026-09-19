import { environment, getPreferenceValues } from "@raycast/api";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrinterConfig, streamUrl } from "./config";
import { ipcRequest, waitForPlayback } from "./mpv-ipc";

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

/**
 * The IPC socket doubles as the viewer's identity: only an mpv launched by this extension has it in its
 * arguments. It lives in the per-user temp dir because Unix socket paths are limited to 104 bytes.
 */
const socketPath = () => path.join(os.tmpdir(), "raycast-bambu-live-view.sock");

/** How long mpv gets to open the stream before we give up. */
const STARTUP_TIMEOUT_MS = 15_000;

function mpvArgs(): string[] {
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
    `--input-ipc-server=${socketPath()}`,
    // The stream URL contains the access code, so it's piped in on stdin rather than passed as an
    // argument, where any process could read it with `ps`.
    "--playlist=-",
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
 * Only trust the stored PID if it's an mpv process started by this extension (identified by our IPC
 * socket in its arguments) — PIDs get reused, and we must never kill an unrelated process, including
 * another mpv playing the same printer.
 */
function isOurViewer(pid: number): boolean {
  const comm = psField(pid, "comm");
  if (!comm || path.basename(comm) !== "mpv") return false;
  return psField(pid, "args")?.includes(`--input-ipc-server=${socketPath()}`) ?? false;
}

/** Returns the PID of the running live view, cleaning up a stale PID file if needed. */
export function runningViewerPid(): number | undefined {
  const pid = readPid();
  if (pid === undefined) return undefined;
  if (isOurViewer(pid)) return pid;
  clearPid();
  return undefined;
}

/** Asks our mpv to quit over IPC, falling back to SIGTERM if it doesn't answer. */
export async function stopViewer(pid: number) {
  try {
    const ipcPid = await ipcRequest(socketPath(), ["get_property", "pid"]);
    if (ipcPid === pid) {
      await ipcRequest(socketPath(), ["quit"]);
      return;
    }
    process.kill(pid, "SIGTERM");
  } catch (error) {
    // Already exited between the check and the kill — nothing to do.
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  } finally {
    clearPid();
  }
}

/**
 * Starts mpv and resolves once the stream is actually playing. Rejects with a StartupError if the printer
 * rejects the access code, mpv exits, or the stream doesn't open in time.
 */
export async function startViewer(mpvPath: string, config: PrinterConfig): Promise<void> {
  fs.rmSync(socketPath(), { force: true });
  const child = spawn(mpvPath, mpvArgs(), { detached: true, stdio: ["pipe", "ignore", "ignore"] });

  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("spawn", resolve);
  });
  child.stdin?.end(`${streamUrl(config)}\n`);
  if (child.pid === undefined) throw new Error("mpv did not start");
  writePid(child.pid);

  try {
    await waitForPlayback(child, socketPath(), STARTUP_TIMEOUT_MS);
  } catch (error) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // Already exited.
    }
    clearPid();
    throw error;
  } finally {
    child.unref();
  }
}
