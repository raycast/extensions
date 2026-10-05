/** Small date helpers working in UTC to keep ISO (YYYY-MM-DD) math stable. */

/** Format a Date as an ISO calendar date (YYYY-MM-DD) in UTC. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse an ISO calendar date (YYYY-MM-DD) into a UTC Date at midnight. */
export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Today's date as an ISO calendar date in UTC. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Return the ISO date `days` after (or before, if negative) `iso`. */
export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/** Whole days from `startIso` to `endIso` (endIso - startIso). */
export function daysBetween(startIso: string, endIso: string): number {
  const ms = fromIsoDate(endIso).getTime() - fromIsoDate(startIso).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Split an inclusive [startIso, endIso] range into consecutive chunks each no
 * longer than `maxDays`, so every chunk fits a single timeseries request.
 */
export function splitIntoChunks(
  startIso: string,
  endIso: string,
  maxDays: number,
): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = startIso;
  while (cursor <= endIso) {
    // maxDays points means a span of (maxDays - 1) between endpoints.
    const chunkEnd = addDays(cursor, maxDays - 1);
    const end = chunkEnd < endIso ? chunkEnd : endIso;
    chunks.push({ start: cursor, end });
    cursor = addDays(end, 1);
  }
  return chunks;
}
