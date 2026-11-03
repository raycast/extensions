import { execFile } from "node:child_process";

interface RunOptions {
  timeoutMs?: number;
  /**
   * Exit codes that still mean success. `lsof` exits 1 when nothing matched or
   * one of several PIDs is gone, and `ps -p` exits 1 when a PID has exited;
   * their output is still valid. Any other code is an error.
   */
  okExitCodes?: number[];
}

/** Runs a command and returns stdout, or rejects with an error that includes stderr. */
export function run(file: string, args: string[], { timeoutMs = 10_000, okExitCodes = [0] }: RunOptions = {}) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      file,
      args,
      { maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }
        if (typeof error.code === "number" && okExitCodes.includes(error.code)) {
          resolve(stdout);
          return;
        }
        const detail = stderr.trim() || error.message;
        reject(new Error(`${file} failed: ${detail}`, { cause: error }));
      },
    );
  });
}
