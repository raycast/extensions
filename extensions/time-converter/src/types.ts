/**
 * Core types used throughout the extension
 */
export interface TimeZoneData {
  displayName: string; // Human readable timezone name
  timezone: string; // IANA timezone identifier
}

export interface Preferences {
  defaultLocations: string; // Comma-separated default locations
  defaultFormat: "list" | "inline"; // Output format preference
}

export interface TimeConversion {
  location: string; // Original location name
  time: string; // Converted time
  timezone: string; // Resolved timezone
}
