// How far a Mint that reports nothing is, guessed from how long the same
// request took before. Pure, so the tests call what the commands draw.

/** The share an estimate shows when the expected time is up. */
const AT_EXPECTED = 0.85;
/** Never claimed: only Mint's answer finishes the bar. */
const CEILING = 0.99;

/**
 * The guess for a request running `seconds` that usually takes `expected`:
 * quick at first, 85% at the expected time, and still moving after it, more
 * slowly the longer it runs, so a slower run than usual never sits still.
 * The first version stopped at 95% the moment the last run's time was up,
 * and a scan slower than the last one then held there for most of a minute.
 */
export function estimatedFraction(seconds: number, expected: number): number {
  if (!(seconds > 0) || !(expected > 0)) return 0;
  const rate = -Math.log(1 - AT_EXPECTED) / expected;
  return Math.min(CEILING, 1 - Math.exp(-rate * seconds));
}

/** What to expect from the recent runs: the slowest of them, so a slow run is the one planned for. */
export function expectedSeconds(recent: number[], fallback: number): number {
  const valid = recent.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.max(...valid) : fallback;
}
