// Copied from raycast-window-switcher src/lib/run-helper.ts on 2026-09-30, unchanged except this header,
// architectureFailure, failureText wording for Store installs (no project folder to rebuild in), and a 5 s
// FOCUS_TIMEOUT_MS
// Runs the bundled helper once per call: no shell, fixed arguments, hard timeout (SPEC.md §7.4).
// Takes the helper path as a parameter so tests can use fake helpers. Pure Node, no Raycast imports.
import { execFile } from "node:child_process";
import { chmodSync, statSync } from "node:fs";
import type { Failure } from "./protocol.ts";

export const LIST_TIMEOUT_MS = 5000;
// The helper's own waits in its slowest focus path add up to about 3.5 s (unminimize 0.6, then public and private
// activation at 0.5 + 0.8 each, plus a 0.25 s window scan), so the caller allows 5 s instead of cutting it off at 3 s.
export const FOCUS_TIMEOUT_MS = 5000;

export type RunResult = { ok: true; stdout: string } | { ok: false; failure: Failure };

/** Restores the execute bit if a copy step dropped it. */
export function ensureExecutable(helperPath: string): void {
  try {
    const { mode } = statSync(helperPath);
    if ((mode & 0o100) === 0) chmodSync(helperPath, mode | 0o755);
  } catch {
    // Missing file or failed chmod: execFile reports ENOENT or EACCES below.
  }
}

export function runHelper(helperPath: string, args: string[], timeoutMs: number): Promise<RunResult> {
  ensureExecutable(helperPath);
  return new Promise((resolve) => {
    execFile(helperPath, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (!error) return resolve({ ok: true, stdout });
      const err = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string | null };
      if (err.code === "ENOENT") return resolve(fail("helper-missing", `Helper not found at ${helperPath}`));
      if (err.code === "EACCES") return resolve(fail("helper-not-executable", "Helper is not executable"));
      if (err.killed || err.signal === "SIGTERM") {
        return resolve(fail("timeout", `Helper did not answer within ${timeoutMs / 1000} s`));
      }
      // Non-zero exit that still printed JSON (usage errors): let the parser report it.
      if (stdout.trim().startsWith("{")) return resolve({ ok: true, stdout });
      resolve(fail("helper-error", (stderr || err.message).trim().slice(0, 300)));
    });
  });
}

/**
 * The helper is built for arm64 only (README, Helpers and provenance). On any other
 * architecture the call fails before the helper runs, with a clear reason.
 */
export function architectureFailure(arch: string): RunResult | undefined {
  if (arch === "arm64") return undefined;
  return fail("unsupported-architecture", `arch: ${arch}, helper not run`);
}

function fail(kind: Failure["kind"], detail: string): RunResult {
  return { ok: false, failure: { kind, detail } };
}

const REINSTALL = "Reinstall the extension from the Raycast Store, then press ⌘R.";

/** User-facing wording for each failure class (SPEC.md §9). */
export function failureText(f: Failure): { title: string; description: string } {
  switch (f.kind) {
    case "helper-missing":
      return { title: "Helper not installed", description: REINSTALL };
    case "helper-not-executable":
      return { title: "Helper not executable", description: REINSTALL };
    case "timeout":
      return { title: "Window scan timed out", description: "An app may be unresponsive. Press ⌘R to try again." };
    case "not-trusted":
      return {
        title: "Raycast needs Accessibility",
        description:
          "System Settings → Privacy & Security → Accessibility → turn on Raycast. Change it only while Raycast is quit.",
      };
    case "version-mismatch":
      return { title: "Helper version mismatch", description: REINSTALL };
    case "unsupported-architecture":
      return {
        title: "Requires a Mac with Apple silicon",
        description: "The window helper is built for Apple silicon only.",
      };
    case "bad-output":
    case "helper-error":
      return { title: "Window helper failed", description: f.detail };
  }
}
