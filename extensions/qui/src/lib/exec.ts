import { execFile } from "node:child_process";

/**
 * Runs a command and returns stdout. Non-zero exit codes are tolerated as long
 * as the command produced output: `lsof` exits 1 when one of several PIDs is
 * gone or when nothing matched, and its output is still valid.
 */
export function run(file: string, args: string[], timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs, windowsHide: true }, (error, stdout) => {
      if (error && typeof error.code !== "number") {
        // Spawn failure (ENOENT, timeout kill, …), not an exit code.
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
