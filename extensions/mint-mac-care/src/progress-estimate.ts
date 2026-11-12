// How far a scan is, forecast from how long the same request took before.
// Pure, so the tests call what the commands draw.

/** The share the forecast shows when the expected time is up. */
const AT_EXPECTED = 0.85;
/** Never claimed: only Mint's answer finishes the bar. */
const CEILING = 0.99;

/**
 * Discovery has no known total. Estimate its overall progress from the recent
 * duration of the same request, not the native rule weights. Start at zero and
 * advance evenly through the expected duration, leaving room for slower runs.
 * This only draws a forecast: it never delays a result or finishes a request.
 */
export function scanEstimatedFraction(seconds: number, expected: number): number {
  if (!Number.isFinite(seconds) || !Number.isFinite(expected) || seconds <= 0 || expected <= 0) return 0;
  const elapsed = seconds / expected;
  if (elapsed <= 1) return AT_EXPECTED * elapsed;
  return AT_EXPECTED + (CEILING - AT_EXPECTED) * (1 - Math.exp(-(elapsed - 1)));
}

/** What to expect from the recent runs: the slowest of them, so a slow run is the one planned for. */
export function expectedSeconds(recent: number[], fallback: number): number {
  const valid = recent.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.max(...valid) : fallback;
}

/** What a request's progress file says, as Mint 1.0.81 to 1.1.2 write it. */
export type ProgressReport = { fraction?: unknown; files?: unknown; phase?: unknown };

/** The forecast shown for one tick, with Mint's latest phase and count. */
export type ProgressStep = { fraction: number; files?: number; phase?: string };

/**
 * One tick of a scan's progress. Mint's `fraction` is never shown: it is a
 * weighted share of rules, not of files or time, and a cleanup scan sits at
 * 0.54 for a minute while the copies scan counts from zero. The bar is the
 * forecast from recent durations, marked estimated; the report supplies only
 * where Mint is and how many files it has read.
 */
export function progressStep(
  previous: ProgressStep,
  report: ProgressReport | undefined,
  seconds: number,
  expected: number,
): ProgressStep {
  let { files, phase } = previous;
  if (report && typeof report.fraction === "number") {
    files =
      typeof report.files === "number" && Number.isSafeInteger(report.files) && report.files >= 0
        ? report.files
        : undefined;
    phase = typeof report.phase === "string" && report.phase.trim() ? report.phase : undefined;
  }
  return { fraction: Math.max(previous.fraction, scanEstimatedFraction(seconds, expected)), files, phase };
}
