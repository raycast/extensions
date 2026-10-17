import { TargetConflict } from "./types";

/**
 * A structured failure from the CLI.
 *
 * On failure the CLI writes `{ ok: false, code, error, message, details? }` to
 * stderr and exits non-zero. When stderr is not JSON (a crash, a lock timeout,
 * a killed process) we still build one of these with code `UNKNOWN` so callers
 * never have to deal with two error shapes.
 */
export class CliError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  /** Raw stderr, kept for the "Copy Error" action. */
  readonly raw: string;

  constructor(code: string, message: string, raw: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.details = details;
    this.raw = raw;
  }
}

/** Thrown when no usable CLI could be resolved. Commands render a guidance screen instead. */
export class CliUnavailableError extends Error {
  readonly reason: "not_installed" | "bridge_broken";

  constructor(reason: "not_installed" | "bridge_broken") {
    super(reason === "bridge_broken" ? "The Skills Manager CLI bridge is broken" : "Skills Manager is not installed");
    this.name = "CliUnavailableError";
    this.reason = reason;
  }
}

export function parseCliError(stderr: string, fallbackMessage: string): CliError {
  const raw = stderr.trim();

  // The CLI writes one JSON object; be tolerant of preamble noise by scanning
  // lines from the end, since the payload is the last thing written.
  for (const line of raw.split("\n").reverse()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(trimmed) as {
        code?: string;
        message?: string;
        error?: string;
        details?: Record<string, unknown>;
      };
      const message = parsed.message ?? parsed.error ?? fallbackMessage;
      return new CliError(parsed.code ?? "UNKNOWN", message, raw, parsed.details);
    } catch {
      // Not the payload line; keep scanning.
    }
  }

  return new CliError("UNKNOWN", raw || fallbackMessage, raw);
}

/**
 * Pulls the blocked targets out of a TARGET_CONFLICT error.
 *
 * A deploy that would overwrite something Skills Manager does not own is
 * refused outright: nothing at those paths is touched and nothing else in the
 * batch is applied. Returns an empty array for any other error.
 */
export function targetConflicts(error: unknown): TargetConflict[] {
  if (!(error instanceof CliError) || error.code !== "TARGET_CONFLICT") return [];
  const conflicts = error.details?.conflicts;
  if (!Array.isArray(conflicts)) return [];
  return conflicts.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { path, reason } = entry as { path?: unknown; reason?: unknown };
    if (typeof path !== "string") return [];
    return [{ path, reason: typeof reason === "string" ? reason : "conflicts with an existing path" }];
  });
}

/**
 * True when the failure looks like contention over the SQLite database or the
 * repository lock, which the CLI shares with the desktop app. Worth retrying.
 */
export function isLockContention(error: unknown): boolean {
  if (!(error instanceof CliError)) return false;
  if (error.code === "LOCKED" || error.code === "REPO_LOCKED") return true;
  return /\block(ed)?\b|database is locked|busy/i.test(error.message);
}

/**
 * True when the CLI could not resolve a reference — the object was renamed or
 * deleted, here or in the desktop app. Callers use it to stay quiet about a
 * selection that has gone stale without also silencing real failures.
 */
export function isNotFound(error: unknown): boolean {
  return error instanceof CliError && /not found/i.test(error.message);
}

export function errorMessage(error: unknown): string {
  if (error instanceof CliError || error instanceof CliUnavailableError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
