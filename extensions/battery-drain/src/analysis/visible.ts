const TOP = 5;
const MIN_SHOWN_CPU = 2; // a row must read at least "2% CPU" once rounded

/** Energy impact clearly above CPU (1.5× and 10 points): the row costs battery beyond CPU, via GPU or wakeups. */
export function hasExtraCost(r: { cpu: number; energy: number }): boolean {
  return r.energy >= r.cpu * 1.5 && r.energy - r.cpu >= 10;
}

/**
 * Rows worth showing, in their given order: the top five that read 2% CPU or more (anything at 1% or
 * below says nothing on a quiet Mac) or cost battery beyond CPU, plus any runaway pid outside them,
 * since a hidden runaway is a missed diagnosis.
 */
export function visibleRows<T extends { cpu: number; energy: number; pid?: number }>(
  rows: T[],
  runawayPids: Set<number> = new Set(),
): T[] {
  const top = rows.filter((r) => Math.round(r.cpu) >= MIN_SHOWN_CPU || hasExtraCost(r)).slice(0, TOP);
  const extra = rows.filter((r) => r.pid !== undefined && runawayPids.has(r.pid) && !top.includes(r));
  return [...top, ...extra];
}
