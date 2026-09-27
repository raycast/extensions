import { execFileSync, spawn } from "child_process";
import { environment } from "@raycast/api";
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
      error: `Helper binary is missing at ${helperPath}. Run "npm run build-helper" first.`,
    };
  }
  try {
    fs.accessSync(helperPath, fs.constants.X_OK);
  } catch {
    try {
      fs.chmodSync(helperPath, 0o755);
    } catch (error) {
      return {
        success: false,
        error: `Helper is not executable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  return { success: true };
}

export async function startHelper(layoutMode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const helperPath = getHelperPath();
  const prepared = prepareHelper(helperPath);
  if (!prepared.success) return prepared;

  let out: number | null = null;
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
    child.unref();
  } catch (error) {
    return {
      success: false,
      error: `Helper failed to launch: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (out !== null) fs.closeSync(out);
  }

  // Poll for the helper to write its PID (event tap + window ready).
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 100));
    const pid = readPid();
    if (pid) return { success: true };
  }

  try {
    const log = fs.readFileSync(LOG_FILE, "utf8");
    return {
      success: false,
      error: `Helper failed to start. Log tail: ${log.slice(-300)}`,
    };
  } catch {
    return { success: false, error: "Helper failed to start." };
  }
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
