export type IPKind = "local" | "external";

export interface IPEntry {
  /** Stable list key: an IP can legitimately show up from more than one source. */
  key: string;
  ip: string;
  /** Network interface for local IPs, service name for external ones. */
  source: string;
  kind: IPKind;
  family: "IPv4" | "IPv6";
  /** From the source's own trace response — no geo lookup involved. */
  countryCode?: string;
}

/** The fields we care about in a Cloudflare `/cdn-cgi/trace` body. */
export interface TraceInfo {
  ip?: string;
  countryCode?: string;
}

export interface SourceFailure {
  source: string;
  message: string;
}

export interface IPCollection {
  entries: IPEntry[];
  failures: SourceFailure[];
}

export interface GeoInfo {
  /** Country flag emoji, or an empty string when the country is unknown. */
  flag: string;
  /** "City, Country" */
  place: string;
  /** "City, Country 🇺🇸" — ready to display. */
  label: string;
  /** ISO 3166-1 alpha-2, when the lookup returned a usable code. */
  countryCode?: string;
}

/** Geo lookup results, keyed by IP. */
export type GeoMap = Record<string, GeoInfo>;

/** The full ip-api.com record behind a single address. */
export interface IPDetails {
  ip: string;
  continent?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  district?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  /** Offset from UTC, in seconds. */
  offset?: number;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  reverse?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}
