// Typed bridge over `yerd --json <args>`. Maps documented exit codes to the
// error taxonomy in ./errors:
//   0  → parsed JSON payload
//   1  → YerdDaemonError (or doctor findings — see runYerdDoctor)
//   2  → YerdUsageError
//   69 → DaemonUnreachableError
//   74 → YerdTransportError
// Timeouts (execFile kill) → YerdTimeoutError; unparseable stdout → YerdParseError.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveYerdBinary } from "./paths";
import type { DoctorResponse } from "./types";
import {
  DaemonUnreachableError,
  YerdDaemonError,
  YerdNotInstalledError,
  YerdParseError,
  YerdTimeoutError,
  YerdTransportError,
  YerdUsageError,
} from "./errors";

const execFileAsync = promisify(execFile);

export const TIMEOUTS = {
  read: 15_000,
  logs: 20_000,
  mutate: 30_000,
  secure: 60_000,
  doctor: 60_000,
  dbTransfer: 120_000,
  tunnelShare: 90_000,
  install: 600_000,
} as const;

export interface RunOptions {
  timeoutMs?: number;
}

interface Prefs {
  yerdPath?: string;
}

/** Shape of a promisified execFile rejection. */
interface ExecFailure {
  killed?: boolean;
  code?: number | string | null;
  stdout?: string;
  stderr?: string;
}

/**
 * Load preferences from the Raycast runtime. Outside Raycast (unit tests,
 * CLI probes) @raycast/api cannot be imported — fall back to empty prefs so
 * discovery proceeds via the default path / PATH scan.
 */
async function loadPrefs(): Promise<Prefs> {
  try {
    const api = await import("@raycast/api");
    return api.getPreferenceValues<Prefs>();
  } catch {
    return {};
  }
}

/** Run `yerd --json <args>` and parse the JSON response as T. */
export async function runYerd<T>(
  args: string[],
  opts: RunOptions = {},
): Promise<T> {
  const bin = resolveYerdBinary(await loadPrefs());
  const timeoutMs = opts.timeoutMs ?? TIMEOUTS.read;
  try {
    const { stdout } = await execFileAsync(bin, ["--json", ...args], {
      timeout: timeoutMs,
    });
    try {
      return JSON.parse(stdout) as T;
    } catch {
      throw new YerdParseError(stdout.slice(0, 200));
    }
  } catch (err: unknown) {
    // Re-throw errors we already typed (custom classes carry a custom name)
    if (err instanceof YerdParseError) throw err;
    if (err instanceof Error && err.name !== "Error") throw err;

    const e = err as ExecFailure;

    // execFile timeout: killed=true, code=null
    if (e.killed) throw new YerdTimeoutError(args[0] ?? "unknown");
    // Binary vanished between discovery and exec
    if (e.code === "ENOENT") throw new YerdNotInstalledError();
    // Numeric exit codes
    const exit = typeof e.code === "number" ? e.code : null;
    if (exit === 69) throw new DaemonUnreachableError();
    if (exit === 74) throw new YerdTransportError(e.stderr ?? "");
    if (exit === 2) {
      const detail =
        tryParseErrorBody(e.stdout, e.stderr) ?? e.stderr ?? "Usage error";
      throw new YerdUsageError(detail);
    }
    if (exit === 1) {
      const detail =
        tryParseErrorBody(e.stdout, e.stderr) ?? e.stderr ?? "Daemon error";
      throw new YerdDaemonError(detail);
    }
    throw new YerdTransportError(String(err));
  }
}

/**
 * Doctor variant: accepts exit 0 AND 1 as data (doctor exits 1 when Fail
 * findings exist). Doctor NEVER exits 69 — an unreachable daemon surfaces as
 * a synthetic Fail item in the JSON body with exit 1; the 69 branch below is
 * a defensive fallback only.
 */
export async function runYerdDoctor(
  opts: RunOptions = {},
): Promise<DoctorResponse> {
  const bin = resolveYerdBinary(await loadPrefs());
  const timeoutMs = opts.timeoutMs ?? TIMEOUTS.doctor;
  try {
    const { stdout } = await execFileAsync(bin, ["--json", "doctor"], {
      timeout: timeoutMs,
    });
    return JSON.parse(stdout) as DoctorResponse;
  } catch (err: unknown) {
    const e = err as ExecFailure;
    // exit 1 with JSON body = doctor findings (Fail severity)
    const exit = typeof e.code === "number" ? e.code : null;
    if (exit === 1 && e.stdout) {
      try {
        return JSON.parse(e.stdout) as DoctorResponse;
      } catch {
        /* fall through to error mapping */
      }
    }
    if (e.killed) throw new YerdTimeoutError("doctor");
    if (exit === 69) {
      // Documented as unreachable per /reference/cli/diagnostics.md
      throw new DaemonUnreachableError();
    }
    if (exit === 74) throw new YerdTransportError(e.stderr ?? "");
    throw new YerdDaemonError(e.stderr ?? String(err));
  }
}

function tryParseErrorBody(stdout?: string, stderr?: string): string | null {
  for (const s of [stdout, stderr]) {
    if (!s) continue;
    try {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      if (typeof parsed.error === "string") return parsed.error;
      if (typeof parsed.message === "string") return parsed.message;
    } catch {
      /* not JSON */
    }
  }
  return null;
}
