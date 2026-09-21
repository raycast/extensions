export interface Proposal {
  choice?: number;
  date?: string;
  start?: string;
  end?: string;
  durationMinutes?: number;
  reason?: string;
}

type Outcome =
  | { kind: "committed"; undoToken?: string; eventId?: string }
  | { kind: "proposals"; options: Proposal[]; commitToken: string; expiresAt?: number; eventId?: undefined }
  | { kind: "failed"; eventId?: undefined };

/** Read the documented BatchOutcome shape (the response type is loose JSON). */
export function readOutcome(data: Record<string, unknown>): Outcome {
  const results = Array.isArray(data.results) ? (data.results as Record<string, unknown>[]) : [];
  const row = results[0];
  if (row?.status !== "ok" || !row.result || typeof row.result !== "object") return { kind: "failed" };
  const first = row.result as Record<string, unknown>;
  if (first.status === "committed" || (typeof data.committed === "number" && data.committed > 0)) {
    return {
      kind: "committed",
      undoToken: (first.undoToken ?? data.undoToken) as string | undefined,
      eventId: committedEventId(first),
    };
  }
  if (
    first.status === "proposals" &&
    typeof first.commitToken === "string" &&
    first.commitToken &&
    Array.isArray(first.options) &&
    first.options.length > 0
  ) {
    return {
      kind: "proposals",
      options: (first.options as Proposal[]) ?? [],
      commitToken: (first.commitToken as string) ?? "",
      expiresAt: proposalDeadline(first),
    };
  }
  return { kind: "failed" };
}

/** The id of the event a committed plan row made, when the row names it. */
function committedEventId(row: Record<string, unknown>): string | undefined {
  const event = row.event as { id?: unknown } | undefined;
  return typeof event?.id === "string" ? event.id : typeof row.id === "string" ? row.id : undefined;
}

/**
 * Absolute expiry (epoch ms) for a proposal set. Prefer `expiresInMs` (a
 * relative window), else parse `expiresAt`. The server tunes the length, so
 * never assume a fixed 10 min.
 */
function proposalDeadline(first: Record<string, unknown>): number | undefined {
  if (typeof first.expiresInMs === "number") return Date.now() + first.expiresInMs;
  if (typeof first.expiresAt === "string") {
    const parsed = Date.parse(first.expiresAt);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  // A bare number may be epoch seconds or ms. 1e12 ms is year 2001, so any real
  // future ms value is above it while epoch seconds stay below — scale seconds up.
  if (typeof first.expiresAt === "number") {
    return first.expiresAt < 1e12 ? first.expiresAt * 1000 : first.expiresAt;
  }
  return undefined;
}
