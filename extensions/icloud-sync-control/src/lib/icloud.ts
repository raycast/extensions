import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROCESS_NAME = "bird";

export type SyncStatus = "running" | "paused";

async function getBirdPid(): Promise<number> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-x", PROCESS_NAME]);
    const pid = parseInt(stdout.trim().split("\n")[0], 10);
    if (Number.isNaN(pid)) throw new Error("pgrep returned no pid");
    return pid;
  } catch {
    throw new Error("iCloud Drive (bird) is not running. Is iCloud Drive enabled and signed in?");
  }
}

export async function getStatus(): Promise<SyncStatus> {
  const pid = await getBirdPid();
  const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "state="]);
  return stdout.trim().startsWith("T") ? "paused" : "running";
}

export async function pauseSync(): Promise<void> {
  const pid = await getBirdPid();
  process.kill(pid, "SIGSTOP");
}

export async function resumeSync(): Promise<void> {
  const pid = await getBirdPid();
  process.kill(pid, "SIGCONT");
}
