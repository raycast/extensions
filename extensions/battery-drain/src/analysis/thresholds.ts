export type Thresholds = {
  runawayCpu: number; // % of one core
  runawayMinSec: number;
  highWatts: number;
  highWattsPoints: number;
  highEnergy: number;
  maxGapMs: number; // longer gaps mean sleep or a paused menu bar
  minDrainSpanMs: number;
  maxPlausibleWatts: number; // anything above is a telemetry glitch, not a real draw
};

export const THRESHOLDS: Thresholds = {
  runawayCpu: 80,
  runawayMinSec: 15 * 60,
  highWatts: 25,
  highWattsPoints: 3,
  highEnergy: 50,
  maxGapMs: 10 * 60 * 1000,
  minDrainSpanMs: 10 * 60 * 1000,
  maxPlausibleWatts: 1000,
};

export type ThresholdPreferences = Partial<Record<"runawayCpu" | "runawayMinutes" | "highWatts", string>>;

/** A plain decimal within [min, max]; hex, exponents and tiny values (a runaway CPU of 1%) are rejected. */
function inRange(raw: string | undefined, min: number, max: number): number | undefined {
  if (raw === undefined || !/^\s*\d+(\.\d+)?\s*$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= min && n <= max ? n : undefined;
}

/** Preference text fields → thresholds; anything missing or out of range keeps the default. */
export function thresholdsFrom(prefs: ThresholdPreferences): Thresholds {
  const minutes = inRange(prefs.runawayMinutes, 1, 24 * 60);
  return {
    ...THRESHOLDS,
    runawayCpu: inRange(prefs.runawayCpu, 10, 400) ?? THRESHOLDS.runawayCpu,
    runawayMinSec: minutes !== undefined ? minutes * 60 : THRESHOLDS.runawayMinSec,
    highWatts: inRange(prefs.highWatts, 1, THRESHOLDS.maxPlausibleWatts) ?? THRESHOLDS.highWatts,
  };
}
