export type LocationKind = "city" | "zone";

export type Location = {
  /** "gn:2867714" (GeoNames) | "lc:US:OLL" (UN/LOCODE) | "tz:UTC" (named zone) | "custom:<uuid>" */
  id: string;
  kind: LocationKind;
  /** Display name, user-editable. */
  label: string;
  /** IANA time zone. */
  tz: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  /** Admin-1 name, e.g. "Bavaria". */
  region?: string;
  /** Lower-case; generated codes (UN/LOCODE, IATA) plus user-added. */
  aliases: string[];
  isHome?: boolean;
  /** Overrides the global business-hours preference. */
  businessHours?: { start: number; end: number };
  /** Menu Bar Clock: whether this location appears in the menu bar title, and an optional template override. */
  menuBar?: { show: boolean; format?: string };
};

export type TimeOfDay = { h: number; m: number };

export type DateSpec =
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "weekday"; weekday: number } // 0 = Sunday … 6 = Saturday
  | { kind: "ymd"; y: number; m: number; d: number }
  | { kind: "md"; m: number; d: number }
  /** Numeric "a/b" whose order depends on the dateOrder preference. */
  | { kind: "numeric"; a: number; b: number; y?: number };

export type ParsedExpression = {
  start?: TimeOfDay;
  end?: TimeOfDay;
  /** Minutes; only together with `start` and never with `end`. */
  duration?: number;
  date?: DateSpec;
  /** The word that produced a weekday date ("sat"), so a configured location with that code can reclaim it. */
  dateToken?: string;
  /** Leftover words naming a zone or place, e.g. "new york" or "cest". */
  zoneQuery?: string;
  /** Fixed offset in minutes from tokens like "utc+2" / "gmt-5:30". */
  fixedOffset?: number;
  /** Words the parser could not classify, in input order. */
  errors: string[];
};

/** Extension-level preferences plus the running command's own; `getPreferenceValues()` merges them. */
export type Preferences = {
  timeFormat: "24h" | "12h";
  copyTemplate: string;
  copySeparator: string;
  sortOrder: "offset" | "offsetDesc" | "manual";
  businessHours: string;
  shoulderHours: string;
  colorBusiness?: string;
  colorShoulder?: string;
  colorOff?: string;
  stripColorBusiness?: string;
  stripColorShoulder?: string;
  stripColorOff?: string;
  locationsFile: string;
  // Convert Time
  defaultAnchor?: "local" | "utc" | "home" | "last";
  popToRootAfterCopy?: boolean;
  showLocalRow?: boolean;
  dateOrder?: "dmy" | "mdy";
  // Menu Bar Clock
  menuBarTemplate?: string;
  menuBarSeparator?: string;
  menuBarIcon?: boolean;
  // Manage Locations
  onlineLookup?: boolean;
};

export type HourRange = { start: number; end: number };

/** Something a zone token resolved to: a configured location, a dataset hit, or a bare IANA/fixed zone. */
export type ZoneTarget = {
  tz: string;
  label: string;
  location?: Location;
  /** Set when the match came from outside the configured list (dataset, IANA name, fixed offset). */
  transient?: Location;
};

export type Resolved = {
  anchor: ZoneTarget;
  /** Instant (ms since epoch). */
  start: number;
  /** Instant (ms); present for windows. */
  end?: number;
  /** True when no time was typed: minutes follow the clock. */
  live: boolean;
  /** Alternative configured locations that also matched the zone token. */
  ambiguous: Location[];
  errors: string[];
};
