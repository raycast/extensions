// Copied from badge-count-raycast src/lib/run-helper.ts on 2026-09-30, unchanged except this header
// Runs the Dock helper once. No shell, no arguments, 3 s timeout (SPEC.md 5.4).
// Takes the helper path as a parameter so tests can point it at fake helpers.
import { execFile } from "node:child_process";
import { chmodSync, statSync } from "node:fs";
import type { HelperRun } from "./helper-output";

export const HELPER_TIMEOUT_MS = 3000;

/** Set the executable bit if a copy step dropped it. Returns true if it changed. */
function ensureExecutable(helperPath: string): boolean {
  try {
    const { mode } = statSync(helperPath);
    if ((mode & 0o100) !== 0) return false;
    chmodSync(helperPath, mode | 0o755);
    return true;
  } catch {
    // Missing file: execFile reports ENOENT. Failed chmod: execFile reports EACCES.
    return false;
  }
}

export function runHelper(helperPath: string, timeoutMs = HELPER_TIMEOUT_MS): Promise<HelperRun> {
  const repairedMode = ensureExecutable(helperPath);
  const started = Date.now();
  return new Promise((resolve) => {
    execFile(
      helperPath,
      [],
      { timeout: timeoutMs, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, encoding: "utf8" },
      (error, stdout, stderr) => {
        const err = error as (NodeJS.ErrnoException & { killed?: boolean; signal?: string | null }) | null;
        const spawnErrorCode = typeof err?.code === "string" ? err.code : null;
        const exitCode = err ? (typeof err.code === "number" ? err.code : null) : 0;
        const signal = err?.signal ?? null;
        resolve({
          helperPath,
          exitCode,
          signal,
          timedOut: Boolean(err?.killed && signal === "SIGKILL" && exitCode === null && !spawnErrorCode),
          spawnErrorCode,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          elapsedMs: Date.now() - started,
          repairedMode,
        });
      },
    );
  });
}
