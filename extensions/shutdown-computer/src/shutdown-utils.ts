import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);
export const SHUTDOWN_TARGET_TIME_KEY = "shutdownTargetTime";
export const WINDOWS_SHUTDOWN_LIMIT_SECONDS = 315_360_000;

export function formatDuration(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export async function abortExistingShutdown(): Promise<boolean> {
  try {
    await execFileAsync("shutdown", ["/a"]);
    return true;
  } catch {
    // Windows exits non-zero when there is no pending shutdown to abort.
    return false;
  }
}
