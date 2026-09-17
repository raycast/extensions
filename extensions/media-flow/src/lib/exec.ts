import { execFile } from "node:child_process";

export interface ExecOptions {
  timeoutMs?: number;
  retries?: number;
}

/** Run a binary; resolve trimmed stdout, or null on ANY failure. Never throws. */
export async function execSafe(file: string, args: string[], opts: ExecOptions = {}): Promise<string | null> {
  const { timeoutMs = 1500, retries = 1 } = opts;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const out = await new Promise<string | null>((resolve) => {
      execFile(file, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        resolve(err ? null : stdout.trim());
      });
    });
    if (out !== null) return out;
  }
  return null;
}
