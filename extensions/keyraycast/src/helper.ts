import { execSync } from "child_process";
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
  return readPid() !== null;
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

  // Write config to temp file
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config));

  // Launch helper as a fully independent background process
  try {
    execSync(
      `"${helperPath}" --config "${CONFIG_FILE}" --pid "${PID_FILE}" --log "${LOG_FILE}" &`,
      { shell: "/bin/zsh", timeout: 2000, stdio: "ignore" },
    );
  } catch {
    // Safety net: zsh should exit 0 immediately after backgrounding; catch covers spawn/shell failures.
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
  const pid = readPid();
  if (pid !== null) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
    // Wait until the process is gone so restart does not briefly run two helpers.
    for (let i = 0; i < 100; i++) {
      try {
        process.kill(pid, 0);
      } catch {
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      // ignore
    }
  }
}
