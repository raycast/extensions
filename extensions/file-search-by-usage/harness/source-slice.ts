/**
 * Anchored reads of real component source.
 *
 * Several checks compile a span of a shipped component and run it with stubbed
 * dependencies, which is the only way to reach logic that lives inside a React
 * body. The spans are anchored on declaration and comment text, so editing that
 * text moves them.
 *
 * `indexOf` answers -1 for an anchor that no longer matches, and `slice` turns
 * -1 into the empty string. Every assertion built on the span then holds
 * vacuously and still reports PASS. Two spans had been empty for some time
 * before anyone noticed. These helpers throw instead, so a moved anchor is a
 * failure that names itself.
 */

export function locate(source: string, anchor: string, from = 0): number {
  const at = source.indexOf(anchor, from);
  if (at === -1)
    throw new Error(
      `source anchor not found: ${JSON.stringify(anchor)}${from ? ` (searching from ${from})` : ""}`,
    );
  return at;
}

/** The span from the start anchor up to the end anchor, which is excluded. */
export function between(
  source: string,
  start: string,
  end: string,
  from = 0,
): string {
  const open = locate(source, start, from);
  return source.slice(open, locate(source, end, open + start.length));
}

/** The same span, with the end anchor included. */
export function through(
  source: string,
  start: string,
  end: string,
  from = 0,
): string {
  const open = locate(source, start, from);
  return source.slice(
    open,
    locate(source, end, open + start.length) + end.length,
  );
}
