import { execFileSync } from "child_process";
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

// Written by KeyProbe.swift when the event tap can't be created.
const PERMISSION_DENIED_LOG = "Input Monitoring permission not granted";
const INPUT_MONITORING_PANE =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent";

export type StartResult =
  | { success: true }
  | { success: false; error: string; needsPermission?: boolean };

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
    // ray build names the executable after the Swift package's folder.
    return path.basename(command) === "keyprobe-helper";
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

// Only what this launch appended to the log says why it failed: the file
// is shared across launches.
function readLogSince(offset: number): string {
  try {
    return fs.readFileSync(LOG_FILE).subarray(offset).toString("utf8");
  } catch {
    return "";
  }
}

export async function startHelper(layoutMode: string): Promise<StartResult> {
  let logOffset = 0;
  try {
    logOffset = fs.statSync(LOG_FILE).size;
  } catch {
    // no log yet
  }

  try {
    // openPanel starts the panel in a detached process and returns at once;
    // readiness is the PID file appearing, below.
    const { openPanel } = await import("swift:../swift/keyprobe-helper");
    await openPanel(getLayoutDir(), layoutMode, PID_FILE, LOG_FILE);
  } catch (error) {
    return {
      success: false,
      error: `KeyProbe's helper failed to launch: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Poll for the helper to write its PID (event tap + window ready).
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 100));
    const pid = readPid();
    if (pid) return { success: true };
    // The helper exits right after logging this, so stop waiting early.
    if (readLogSince(logOffset).includes(PERMISSION_DENIED_LOG)) break;
  }

  if (readLogSince(logOffset).includes(PERMISSION_DENIED_LOG)) {
    return {
      success: false,
      error: "Grant Input Monitoring to Raycast, then run Open KeyProbe again",
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
