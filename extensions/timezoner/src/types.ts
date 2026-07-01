/** A resolved timezone zone for display */
export interface ZoneInfo {
  /** User-facing label (e.g., "SF", "Bangkok") */
  label: string;
  /** IANA timezone ID (e.g., "America/Los_Angeles") */
  timezone: string;
}

/** Result of formatting a zone at a specific time */
export interface ZoneResult extends ZoneInfo {
  /** Formatted time string (e.g., "3:00 PM") */
  time: string;
  /** Formatted date string (e.g., "Mon, Mar 24") */
  date: string;
  /** Whether this is the source zone in the query */
  isSource: boolean;
  /** Whether this is the target zone in an "X in Y" query */
  isTarget: boolean;
}

export interface ParsedConversionQuery {
  kind: "conversion";
  /** Hour (0-23) */
  hour: number;
  /** Minute (0-59) */
  minute: number;
  /** Source timezone IANA ID */
  sourceTimezone: string;
  /** Source zone label as typed by user */
  sourceLabel: string;
  /** Target timezone IANA ID (for "X in Y" queries) */
  targetTimezone?: string;
  /** Target zone label as typed by user */
  targetLabel?: string;
}

export interface ParsedAddZoneCommand {
  kind: "addZone";
  label: string;
  timezone: string;
}

export interface ParsedRemoveZoneCommand {
  kind: "removeZone";
  label: string;
}

/** Parsed time query or zone command from user input */
export type ParsedQuery =
  | ParsedConversionQuery
  | ParsedAddZoneCommand
  | ParsedRemoveZoneCommand;
