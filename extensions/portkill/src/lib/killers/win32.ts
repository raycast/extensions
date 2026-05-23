import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ProcessKillerError } from "./unix";

const execFileAsync = promisify(execFile);

export async function killProcessWindows(pid: number): Promise<void> {
  if (pid <= 0) {
    return;
  }

  await runTaskkill(pid, false);
  await sleep(450);

  if (await processExistsWindows(pid)) {
    await runTaskkill(pid, true);
  }
}

export async function killProcessesWindows(pids: Iterable<number>): Promise<void> {
  const sorted = [...new Set(pids)].filter((value) => value > 0).sort((a, b) => a - b);
  for (const pid of sorted) {
    await killProcessWindows(pid);
  }
}

async function runTaskkill(pid: number, force: boolean): Promise<void> {
  const args = force ? ["/F", "/PID", String(pid)] : ["/PID", String(pid)];

  try {
    await execFileAsync("taskkill", args, { windowsHide: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    const combined = `${err.stdout ?? ""} ${err.stderr ?? ""}`.toLowerCase();
    if (combined.includes("not found") || combined.includes("no running instance")) {
      return;
    }
    throw new ProcessKillerError(pid, err.message || "taskkill failed");
  }
}

async function processExistsWindows(pid: number): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], { windowsHide: true });
    return !stdout.toLowerCase().includes("no tasks");
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
