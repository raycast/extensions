import { execFileSync, spawn } from "child_process";
import { environment, open, showHUD } from "@raycast/api";
import path from "path";
import fs from "fs";

// supportPath is stable across runs (unlike os.tmpdir(), which on macOS
// resolves to a per-login-session directory under /var/folders/... — not
// the /tmp you'd expect, and not guessable ahead of time).
const PID_FILE = path.join(environment.supportPath, "keyprobe-helper.pid");
const LOG_FILE = path.join(environment.supportPath, "keyprobe-helper.log");

// LocalStorage key search-layout.tsx writes and open.tsx reads to override
// the Keyboard Layout preference for the next launch.
export const OVERRIDE_KEY = "selectedLayout";

// Written by main.swift when the event tap can't be created.
const PERMISSION_DENIED_LOG = "Input Monitoring permission not granted";
const INPUT_MONITORING_PANE =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent";

export type StartResult =
  | { success: true }
  | { success: false; error: string; needsPermission?: boolean };

function getHelperPath(): string {
  return path.join(environment.assetsPath, "KeyProbeHelper");
}

function getLayoutDir(): string {
  return path.join(environment.assetsPath, "layouts");
}

// A crash or SIGKILL leaves the PID file behind, and macOS may since have
// reused that PID for an unrelated process — which SIGUSR1/SIGTERM would
// then kill. Checking liveness alone can't tell the two apart.
function isKeyProbeHelper(pid: number): boolean {
  try {
    const command = execFileSync("ps", ["-p", String(pid), "-o", "comm="], {
      encoding: "utf8",
    }).trim();
    return path.basename(command) === "KeyProbeHelper";
  } catch {
    return false;
  }
}

function readPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (isNaN(pid)) return null;
    if (isKeyProbeHelper(pid)) return pid;
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      // ignore
    }
    return null;
  } catch {
    return null;
  }
}

export function isRunning(): boolean {
  return readPid() !== null;
}

// Signals the already-running helper to bring its window to the front,
// instead of spawning a second instance.
export function focusExisting(pid: number): void {
  process.kill(pid, "SIGUSR1");
}

function prepareHelper(
  helperPath: string,
): { success: true } | { success: false; error: string } {
  if (!fs.existsSync(helperPath)) {
    return {
      success: false,
      error: "KeyProbe's helper is missing. Try reinstalling the extension.",
    };
  }
  try {
    fs.accessSync(helperPath, fs.constants.X_OK);
  } catch {
    try {
      fs.chmodSync(helperPath, 0o755);
    } catch {
      return {
        success: false,
        error:
          "KeyProbe's helper couldn't be made executable. Try reinstalling the extension.",
      };
    }
  }
  return { success: true };
}

export async function startHelper(layoutMode: string): Promise<StartResult> {
  const helperPath = getHelperPath();
  const prepared = prepareHelper(helperPath);
  if (!prepared.success) return prepared;

  // The log is appended to across launches, so only what this launch
  // writes after this offset says why it failed.
  let logOffset = 0;
  try {
    logOffset = fs.statSync(LOG_FILE).size;
  } catch {
    // no log yet
  }

  let out: number | null = null;
  // spawn() reports exec failures (e.g. a wrong-architecture binary) via
  // this event, not by throwing, so the catch below never sees them.
  let launchError: Error | null = null;
  let exitedWithError = false;
  try {
    out = fs.openSync(LOG_FILE, "a");
    const child = spawn(
      helperPath,
      [
        "--pid",
        PID_FILE,
        "--log",
        LOG_FILE,
        "--layout-dir",
        getLayoutDir(),
        "--layout-mode",
        layoutMode,
      ],
      {
        detached: true,
        stdio: ["ignore", out, out],
      },
    );
    child.on("error", (error) => {
      launchError = error;
    });
    // A non-zero exit before the PID file appears is a failed startup, so
    // there's no point waiting out the rest of the poll. (Zero is a second
    // launch deferring to one that's already starting.)
    child.on("exit", (code) => {
      exitedWithError = code !== 0;
    });
    child.unref();
  } catch (error) {
    return {
      success: false,
      error: `KeyProbe's helper failed to launch: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (out !== null) fs.closeSync(out);
  }

  // Poll for the helper to write its PID (event tap + window ready).
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 100));
    if (launchError) {
      return {
        success: false,
        error: `KeyProbe's helper failed to launch: ${(launchError as Error).message}`,
      };
    }
    const pid = readPid();
    if (pid) return { success: true };
    if (exitedWithError) break;
  }

  let thisLaunchLog = "";
  try {
    thisLaunchLog = fs
      .readFileSync(LOG_FILE)
      .subarray(logOffset)
      .toString("utf8");
  } catch {
    // fall through to the generic message
  }
  if (thisLaunchLog.includes(PERMISSION_DENIED_LOG)) {
    return {
      success: false,
      error:
        "Grant Input Monitoring to KeyProbeHelper, then run Open KeyProbe again",
      needsPermission: true,
    };
  }
  return { success: false, error: "KeyProbe's helper failed to start." };
}

export async function showStartFailure(
  result: Extract<StartResult, { success: false }>,
): Promise<void> {
  if (result.needsPermission) await open(INPUT_MONITORING_PANE);
  await showHUD(`⚠️ ${result.error}`);
}

export function readPidOrNull(): number | null {
  return readPid();
}

// Used by search-layout.tsx to restart an already-open window on a new
// layout — the helper only reads --layout-mode at startup, so changing
// the selection while it's running has no effect until it's relaunched.
export async function stopHelper(pid: number): Promise<void> {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    if (readPid() === null) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}
