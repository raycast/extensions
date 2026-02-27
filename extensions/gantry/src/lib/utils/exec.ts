import { execFile } from "node:child_process";

/**
 * Runs a command and returns its stdout as a string.
 * Options:
 *   nothrow – swallow non-zero exit codes instead of throwing
 */
export function exec(
  command: string,
  args: string[],
  options?: { nothrow?: boolean },
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error && !options?.nothrow) {
          reject(error);
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
