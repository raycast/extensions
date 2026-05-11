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

export async function getStatusWithPid(): Promise<{ status: SyncStatus; pid: number }> {
  const pid = await getBirdPid();
  const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "state="]);
  const status: SyncStatus = stdout.trim().startsWith("T") ? "paused" : "running";
  return { status, pid };
}

export async function pauseSync(pid: number): Promise<void> {
  process.kill(pid, "SIGSTOP");
}

export async function resumeSync(pid: number): Promise<void> {
  process.kill(pid, "SIGCONT");
}
