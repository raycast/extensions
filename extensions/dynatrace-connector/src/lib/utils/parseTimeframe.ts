// utils/parseTimeframe.ts
// Converts human-readable timeframe strings like "2h", "30m", "7d" into ISO 8601 UTC start/end timestamps.

export interface Timeframe {
  start: string;
  end: string;
}

const UNIT_TO_MS: Record<string, number> = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

const DEFAULT_TIMEFRAME = "24h";

/**
 * Parses a timeframe string into a { start, end } pair of ISO 8601 UTC strings.
 *
 * Supported formats:
 *   "30m"  → last 30 minutes
 *   "2h"   → last 2 hours
 *   "7d"   → last 7 days
 *
 * Falls back to DEFAULT_TIMEFRAME ("24h") for empty or unrecognised input.
 *
 * @param input - e.g. "2h", "30m", "7d"
 * @returns { start, end } ISO strings, or null if parsing completely fails
 */
export function parseTimeframe(input: string | undefined | null): Timeframe {
  const raw = (input ?? "").trim().toLowerCase();

  if (raw === "") {
    return buildTimeframe(DEFAULT_TIMEFRAME);
  }

  // If the user typed just a number (e.g. "12"), treat it as hours
  const numberOnly = raw.match(/^(\d+)$/);
  if (numberOnly) {
    const amount = parseInt(numberOnly[1], 10);
    if (amount > 0) {
      const now = Date.now();
      return {
        start: new Date(now - amount * UNIT_TO_MS["h"]).toISOString(),
        end: new Date(now).toISOString(),
      };
    }
  }

  const match = raw.match(/^(\d+)([mhd])$/);
  if (!match) {
    console.warn(`[parseTimeframe] Unrecognised format: "${raw}", falling back to ${DEFAULT_TIMEFRAME}`);
    return buildTimeframe(DEFAULT_TIMEFRAME);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  if (amount <= 0 || !UNIT_TO_MS[unit]) {
    return buildTimeframe(DEFAULT_TIMEFRAME);
  }

  const now = Date.now();
  const start = new Date(now - amount * UNIT_TO_MS[unit]);
  const end = new Date(now);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function buildTimeframe(preset: string): Timeframe {
  const match = preset.match(/^(\d+)([mhd])$/)!;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = Date.now();
  return {
    start: new Date(now - amount * UNIT_TO_MS[unit]).toISOString(),
    end: new Date(now).toISOString(),
  };
}
