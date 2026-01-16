import { GlucoseEntry } from "../types";
import { formatGlucoseWithUnits } from "./unitConversion";

export interface GlucoseStats {
  current: GlucoseEntry | null;
  average: number | null;
  min: number | null;
  max: number | null;
  direction:
    | "NONE"
    | "DoubleUp"
    | "SingleUp"
    | "FortyFiveUp"
    | "Flat"
    | "FortyFiveDown"
    | "SingleDown"
    | "DoubleDown"
    | "NOT COMPUTABLE"
    | "RATE OUT OF RANGE"
    | null;
  timeInRange: {
    high: number;
    target: number;
    low: number;
  };
  readingsCount: number;
  lastUpdated: Date | null;
  devices: string[];
}

/**
 * Calculates statistics for a set of glucose readings.
 * @param readings - array of glucose readings
 * @param targetMin - target minimum glucose level
 * @param targetMax - target maximum glucose level
 * @returns an object containing the calculated glucose statistics
 */
export function calculateGlucoseStats(readings: GlucoseEntry[], targetMin: number, targetMax: number): GlucoseStats {
  if (readings.length === 0) {
    return {
      current: null,
      average: null,
      min: null,
      max: null,
      direction: null,
      timeInRange: { high: 0, target: 0, low: 0 },
      readingsCount: 0,
      lastUpdated: null,
      devices: [],
    };
  }

  // sort by date (newest first) to ensure we get the latest reading
  const sortedReadings = [...readings].sort((a, b) => b.date - a.date);
  const current = sortedReadings[0];

  // NOTE: All glucose values in readings.sgv are in mg/dL
  // targetMin and targetMax are also in mg/dL (from preferences)
  // Keep calculations in mg/dL and convert for display only
  const values = readings.map((r) => r.sgv);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // time in range calculations - all values are in mg/dL
  const lowCount = values.filter((v) => v < targetMin).length;
  const highCount = values.filter((v) => v > targetMax).length;
  const targetCount = values.filter((v) => v >= targetMin && v <= targetMax).length;
  const total = values.length;

  const timeInRange = {
    low: (lowCount / total) * 100,
    target: (targetCount / total) * 100,
    high: (highCount / total) * 100,
  };

  return {
    current,
    average: Math.round(average),
    min,
    max,
    direction: current.direction || null,
    timeInRange,
    readingsCount: readings.length,
    lastUpdated: new Date(current.date),
    devices: Array.from(new Set(readings.map((r) => r.device).filter((d): d is string => !!d))),
  };
}

/**
 * Formats a glucose value for display.
 * @param value - glucose value in mg/dL
 * @param useMmol - whether to convert to mmol/L for display
 * @returns formatted string with value and units
 */
export function formatGlucoseValue(value: number, useMmol: boolean = false): string {
  return formatGlucoseWithUnits(value, useMmol);
}

/**
 * Gets the arrow representation for a glucose trend direction.
 * @param direction - glucose trend direction string
 * @returns arrow character representing the direction
 */
export function getDirectionArrow(direction: string): string {
  const directionMap: Record<string, string> = {
    NONE: "⇼",
    DoubleUp: "⇈",
    SingleUp: "↑",
    FortyFiveUp: "↗",
    Flat: "→",
    FortyFiveDown: "↘",
    SingleDown: "↓",
    DoubleDown: "⇊",
    "NOT COMPUTABLE": "-",
    "RATE OUT OF RANGE": "⇕",
  };

  return directionMap[direction] || "❓";
}

/**
 * Formats a glucose trend direction with arrow and text.
 * @param direction - glucose trend direction string
 * @returns formatted string with arrow and direction text
 */
export function formatDirection(direction: string): string {
  const directionMap: Record<string, string> = {
    NONE: "⇼ None",
    DoubleUp: "⇈ Double Up",
    SingleUp: "↑ Single Up",
    FortyFiveUp: "↗ Forty Five Up",
    Flat: "→ Flat",
    FortyFiveDown: "↘ Forty Five Down",
    SingleDown: "↓ Single Down",
    DoubleDown: "⇊ Double Down",
    "NOT COMPUTABLE": "- Not Computable",
    "RATE OUT OF RANGE": "⇕ Rate Out Of Range",
  };

  return directionMap[direction] || `❓ ${direction}`;
}

/**
 * Gets the glucose level category based on the value and target range.
 * @param value - glucose value in mg/dL
 * @param targetMin - target minimum value in mg/dL
 * @param targetMax - target maximum value in mg/dL
 * @returns "low" | "target" | "high"
 */
export function getGlucoseLevel(value: number, targetMin: number, targetMax: number): "low" | "target" | "high" {
  if (targetMin === undefined || targetMax === undefined) {
    return "target"; // default if targets are not defined
  }
  if (value < targetMin) return "low";
  if (value > targetMax) return "high";
  return "target";
}

/**
 * Gets a user-friendly display string for the glucose trend direction.
 * @param stats - GlucoseStats object
 * @returns formatted direction string or "Unknown" if not available
 */
export function getDirectionDisplay(stats: GlucoseStats): string {
  if (stats.direction) {
    return formatDirection(stats.direction);
  }
  return "Unknown";
}

/**
 * Determines if a glucose reading is recent based on its timestamp.
 * @param reading - glucose reading to check
 * @param maxAgeMinutes - maximum age in minutes to consider as recent (default 15 minutes)
 * @returns true if the reading is recent, false otherwise
 */
export function isRecentReading(reading: GlucoseEntry, maxAgeMinutes: number = 15): boolean {
  const now = Date.now();
  const readingAge = now - reading.date;
  return readingAge <= maxAgeMinutes * 60 * 1000;
}

/**
 * Gets a user-friendly time ago string from a timestamp.
 * @param timestamp - timestamp in milliseconds
 * @returns human-readable time ago string (shorthand format)
 */
export function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
