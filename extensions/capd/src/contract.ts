import type { Hit } from "./types";

/** The `capd` CLI's documented exit codes. They are a stable interface, not sysexits. */
export const ExitCode = {
  ok: 0,
  noResults: 1,
  badUsage: 2,
  storeUnavailable: 3,
  agentNotRunning: 4,
} as const;

export type CapdResult = { stdout: string; stderr: string; code: number };

export class CapdNotInstalled extends Error {
  constructor() {
    super("Could not find the capd command-line tool.");
    this.name = "CapdNotInstalled";
  }
}

export class CapdFailed extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "CapdFailed";
  }
}

export function isAbort(error: unknown): boolean {
  const named = error as { name?: string; code?: number | string } | null;
  return named?.name === "AbortError" || named?.code === "ABORT_ERR";
}

/** `capd` already writes a readable reason to stderr, so prefer it over anything invented here. */
export function explain({ stderr, code }: Pick<CapdResult, "stderr" | "code">): string {
  const reported = stderr.trim();
  if (reported) {
    return reported;
  }

  switch (code) {
    case ExitCode.badUsage:
      return "Capd could not understand that request.";
    case ExitCode.storeUnavailable:
      return "The Capd capture store is unavailable.";
    case ExitCode.agentNotRunning:
      return "The Capd enrichment agent is not running.";
    default:
      return `capd exited with code ${code}.`;
  }
}

/** Distinguishes `Already captured #3 (…)` from `Captured #3: …` in `capd add` output. */
export function wasAlreadyCaptured(line: string): boolean {
  return line.startsWith("Already captured");
}

/** `capd search --json` writes an array, or nothing when there are no hits. */
export function parseHits(stdout: string): Hit[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Capd search returned invalid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Capd search did not return a JSON array.");
  }

  return parsed as Hit[];
}
