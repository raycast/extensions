/**
 * Core types used throughout the extension
 */

export interface Preferences {
  defaultLocations: string;
  defaultFormat: "list" | "inline";
}

/** Result of parsing a single time input */
export interface ParsedDateTime {
  date: Date;
  includesDate: boolean;
  includesYear: boolean;
  isRange: false;
}

/** Result of parsing a time range input (e.g. "1pm - 3pm") */
export interface ParsedDateTimeRange {
  date: Date;
  endDate: Date;
  includesDate: boolean;
  includesYear: boolean;
  isRange: true;
}

export type ParseResult = ParsedDateTime | ParsedDateTimeRange;

/** Conversion result for a single time or a time range */
export interface ConversionResult {
  success: boolean;
  location: string;
  /** Formatted start time (or the only time for single-time conversions) */
  time: string;
  /** Formatted end time — only present for range conversions */
  endTime?: string;
  /**
   * Day name of the start time in the target timezone (e.g. "Friday").
   * Only populated for range conversions.
   */
  startDayName?: string;
  /**
   * Day name of the end time in the target timezone (e.g. "Saturday").
   * Only populated for range conversions.
   */
  endDayName?: string;
  error?: string;
  suggestions?: string[];
}
