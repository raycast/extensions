import { execFile, type ExecFileOptions } from "child_process";

export type ExecFileAsyncOptions = ExecFileOptions & { encoding?: BufferEncoding };

/**
 * Promise-based wrapper around `child_process.execFile` that always resolves
 * string stdout/stderr. Shared across the CLI, auth, and search modules so the
 * spawn/parse logic lives in one place.
 */
export function execFileAsync(
  file: string,
  args: readonly string[],
  options?: ExecFileAsyncOptions,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (options ?? {}) as ExecFileOptions, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}
