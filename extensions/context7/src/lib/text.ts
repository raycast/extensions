/** Irregular plurals this extension actually uses; everything else takes a trailing "s". */
const PLURALS: Record<string, string> = {
  library: "libraries",
  failure: "failures",
};

/**
 * Count-bearing copy that agrees at zero, one, and many — "1 items" is the defect this exists
 * to make unrepresentable.
 */
export function countOf(count: number, noun: string) {
  const plural = PLURALS[noun] ?? `${noun}s`;

  return count === 1 ? `1 ${noun}` : `${count} ${plural}`;
}

/** Parses an ISO timestamp for sorting; unparseable and absent both sort last. */
export function toTimestamp(isoDate?: string) {
  if (!isoDate) {
    return 0;
  }

  const timestamp = new Date(isoDate).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
