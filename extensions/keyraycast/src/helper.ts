import { execFileSync, spawn } from "child_process";
import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";
import os from "os";

const PID_FILE = path.join(os.tmpdir(), "keyraycast-helper.pid");
const CONFIG_FILE = path.join(os.tmpdir(), "keyraycast-config.json");
const LOG_FILE = path.join(os.tmpdir(), "keyraycast-helper.log");

function getHelperPath(): string {
  return path.join(environment.assetsPath, "KeyraycastHelper");
}

function prepareHelper(
  helperPath: string,
): { success: true } | { success: false; error: string } {
  if (!fs.existsSync(helperPath)) {
    return {
      success: false,
      error: `Helper binary is missing at ${helperPath}. Rebuild or reinstall the extension.`,
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

function readPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim());
    if (isNaN(pid)) return null;
    try {
      process.kill(pid, 0); // check alive
      return pid;
    } catch {
      try {
        fs.unlinkSync(PID_FILE);
      } catch {
        // ignore
      }
      return null;
    }
  } catch {
    return null;
  }
}

export function isRunning(): boolean {
  return readPid() !== null || findHelperPids().length > 0;
}

function findHelperPids(): number[] {
  try {
    return execFileSync("/usr/bin/pgrep", ["-f", "KeyraycastHelper( |$)"], {
      encoding: "utf8",
    })
      .split("\n")
      .map((line) => parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntilStopped(
  pid: number,
  attempts: number,
  delayMs: number,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (!isAlive(pid)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return !isAlive(pid);
}

async function terminatePid(pid: number): Promise<void> {
  if (!isAlive(pid)) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // ignore
  }

  if (await waitUntilStopped(pid, 50, 40)) {
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // ignore
  }

  await waitUntilStopped(pid, 25, 40);
}

export async function startOverlay(config: {
  displayMode: string;
  position: string;
  displayDuration: number;
  fontSize: string;
  uppercaseKeys: boolean;
  showSpaceSymbol: boolean;
  showMouseClicks: boolean;
  appearance: string;
}): Promise<{ success: boolean; error?: string }> {
  await stopOverlay();

  const helperPath = getHelperPath();
  const helperStatus = prepareHelper(helperPath);

  if (!helperStatus.success) {
    return helperStatus;
  }

  // Write config to temp file
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config));

  // Launch helper as a fully independent background process
  let out: number | null = null;
  try {
    out = fs.openSync(LOG_FILE, "w");
    const child = spawn(
      helperPath,
      ["--config", CONFIG_FILE, "--pid", PID_FILE, "--log", LOG_FILE],
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

  // Poll for helper to start and write its PID (check every 100ms, timeout after 3s)
  let pid: number | null = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 100));
    pid = readPid();
    if (pid) break;
  }
  if (pid) {
    // Check log for errors
    try {
      const log = fs.readFileSync(LOG_FILE, "utf8");
      if (log.includes("Failed to create event tap")) {
        return {
          success: false,
          error: "Failed to create event tap. Grant Accessibility permission.",
        };
      }
    } catch {
      // ignore
    }
    return { success: true };
  }

  // Check log for error details
  try {
    const log = fs.readFileSync(LOG_FILE, "utf8");
    return {
      success: false,
      error: `Helper failed to start. Log: ${log.substring(0, 200)}`,
    };
  } catch {
    // ignore
  }

  return { success: false, error: "Helper failed to start" };
}

export async function stopOverlay(): Promise<void> {
  const pids = new Set<number>();
  const pid = readPid();
  if (pid !== null) {
    pids.add(pid);
  }
  for (const helperPid of findHelperPids()) {
    pids.add(helperPid);
  }

  for (const helperPid of pids) {
    await terminatePid(helperPid);
  }

  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}
