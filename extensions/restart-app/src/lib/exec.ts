import { execFile } from "node:child_process";

export const OSASCRIPT_PATH = "/usr/bin/osascript";
export const OPEN_PATH = "/usr/bin/open";

export interface ExecOptions {
  timeoutMs: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/** Runs an absolute executable with an argument vector. Never goes through a shell. */
export type ExecFileRunner = (file: string, args: readonly string[], options: ExecOptions) => Promise<ExecResult>;

export class ExecError extends Error {
  readonly stderr: string;
  readonly exitCode: number | string | null;

  constructor(message: string, stderr: string, exitCode: number | string | null) {
    super(message);
    this.name = "ExecError";
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

export const execFileRunner: ExecFileRunner = (file, args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      file,
      [...args],
      { encoding: "utf8", shell: false, timeout: options.timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || (error.killed ? `timed out after ${options.timeoutMs} ms` : error.message);
          reject(new ExecError(detail, stderr, error.code ?? null));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });

/**
 * Runs a JXA script with `osascript -l JavaScript -e <script> <args...>`.
 * Arguments reach the script's `run(argv)` untouched; the first argument must not start with "-".
 */
export async function runJxa(
  script: string,
  args: readonly string[],
  exec: ExecFileRunner,
  timeoutMs = 10_000,
): Promise<string> {
  const { stdout } = await exec(OSASCRIPT_PATH, ["-l", "JavaScript", "-e", script, ...args], { timeoutMs });
  return stdout.trim();
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
