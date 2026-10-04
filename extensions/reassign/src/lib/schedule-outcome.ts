// `start` / `end` are local datetimes.
import type { ApiError } from "./api";
import { type BatchResultRow, rowError } from "./envelope";

export interface Proposal {
  start: string;
  end: string;
  score?: number;
  reason?: string;
}

type Outcome =
  | { kind: "committed"; undoToken?: string; eventId?: string }
  | { kind: "proposals"; options: Proposal[]; commitToken: string; expiresAt?: number; eventId?: undefined }
  // `error` is the server's reason when the row itself was rejected.
  | { kind: "failed"; error?: ApiError; eventId?: undefined };

/**
 * Read the documented batch outcome (the response type is loose JSON). The
 * row result has no kind field: `{ event }` is a booking, and
 * `{ commitToken, expiresAt, options }` is a proposal set.
 */
export function readOutcome(data: Record<string, unknown>): Outcome {
  const results = Array.isArray(data.results) ? (data.results as Record<string, unknown>[]) : [];
  const row = results[0];
  if (row?.status === "error") return { kind: "failed", error: rowError(row as unknown as BatchResultRow) };
  if (row?.status !== "ok" || !row.result || typeof row.result !== "object") return { kind: "failed" };
  const first = row.result as Record<string, unknown>;
  const eventId = committedEventId(first);
  if (eventId) {
    return {
      kind: "committed",
      undoToken: typeof data.undoToken === "string" ? data.undoToken : undefined,
      eventId,
    };
  }
  if (
    typeof first.commitToken === "string" &&
    first.commitToken &&
    Array.isArray(first.options) &&
    first.options.length > 0
  ) {
    return {
      kind: "proposals",
      options: first.options as Proposal[],
      commitToken: first.commitToken,
      expiresAt: proposalDeadline(first),
    };
  }
  return { kind: "failed" };
}

/** The id of the event a committed plan or confirm row made. */
function committedEventId(row: Record<string, unknown>): string | undefined {
  const event = row.event as { id?: unknown } | undefined;
  return typeof event?.id === "string" ? event.id : undefined;
}

/**
 * Absolute expiry (epoch ms) for a proposal set, from the ISO `expiresAt`. The
 * server tunes the length, so never assume a fixed 10 min.
 */
function proposalDeadline(first: Record<string, unknown>): number | undefined {
  if (typeof first.expiresAt !== "string") return undefined;
  const parsed = Date.parse(first.expiresAt);
  return Number.isNaN(parsed) ? undefined : parsed;
}
