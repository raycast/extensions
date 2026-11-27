/**
 * The chart time ranges the extension can offer. Which ones a view actually
 * shows depends on how long the app keeps raw samples (see appSettings.ts).
 */

import { TimeRange } from "./types";

export interface RangeOption {
  value: TimeRange;
  title: string;
  seconds: number;
}

/** Every range, shortest first. */
export const ALL_RANGES: RangeOption[] = [
  { value: "5m", title: "Last 5 Minutes", seconds: 300 },
  { value: "15m", title: "Last 15 Minutes", seconds: 900 },
  { value: "30m", title: "Last 30 Minutes", seconds: 1800 },
  { value: "1h", title: "Last 1 Hour", seconds: 3600 },
  { value: "2h", title: "Last 2 Hours", seconds: 7200 },
  { value: "6h", title: "Last 6 Hours", seconds: 21600 },
  { value: "12h", title: "Last 12 Hours", seconds: 43200 },
  { value: "24h", title: "Last 24 Hours", seconds: 86400 },
  { value: "48h", title: "Last 48 Hours", seconds: 172800 },
];

/** The length of a range in seconds. */
export function rangeSeconds(range: TimeRange): number {
  for (const option of ALL_RANGES) {
    if (option.value === range) {
      return option.seconds;
    }
  }
  return 0;
}

/** The ranges that fit inside the app's raw retention window. */
export function rangesWithin(maxSeconds: number): RangeOption[] {
  const result: RangeOption[] = [];
  for (const option of ALL_RANGES) {
    if (option.seconds <= maxSeconds) {
      result.push(option);
    }
  }
  return result;
}

/**
 * The range a view starts on: the user's preferred default if the app keeps that
 * much history, otherwise the longest range it does keep.
 */
export function startingRange(preferred: TimeRange, available: RangeOption[]): TimeRange {
  if (rangeSeconds(preferred) <= available[available.length - 1].seconds) {
    return preferred;
  }
  return available[available.length - 1].value;
}
