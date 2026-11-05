/**
 * Time zone resolution: IANA identifiers, city names, abbreviations and fixed
 * UTC offsets all end up as a `TimeZone`.
 */

export type TimeZone = {
  /** IANA identifier, or a label such as `UTC+05:30` for a fixed offset. */
  id: string;
  /** Short human label, e.g. `New York`. */
  label: string;
  /** Set only for fixed-offset zones, which never observe DST. */
  fixedOffsetMinutes?: number;
};

/** Used only if the JS engine does not expose `Intl.supportedValuesOf`. */
const FALLBACK_IDS = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/Mexico_City",
  "America/New_York",
  "America/Toronto",
  "America/Halifax",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Vienna",
  "Europe/Prague",
  "Europe/Warsaw",
  "Europe/Budapest",
  "Europe/Athens",
  "Europe/Bucharest",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Europe/Kyiv",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Helsinki",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Pacific/Auckland",
];

let cachedIds: string[] | null = null;

export function allZoneIds(): string[] {
  if (cachedIds) return cachedIds;
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
    "timeZone",
  );
  cachedIds = supported && supported.length > 0 ? supported : FALLBACK_IDS;
  return cachedIds;
}

const validity = new Map<string, boolean>();

function isValidIanaId(id: string): boolean {
  let valid = validity.get(id);
  if (valid === undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: id });
      valid = true;
    } catch {
      valid = false;
    }
    validity.set(id, valid);
  }
  return valid;
}

export function zoneLabel(id: string): string {
  if (id === "UTC" || id === "Etc/UTC" || id === "Etc/GMT") return "UTC";
  const city = id.split("/").pop() ?? id;
  return city.replace(/_/g, " ");
}

function ianaZone(id: string): TimeZone | null {
  if (!isValidIanaId(id)) return null;
  return { id, label: zoneLabel(id) };
}

export function formatOffsetLabel(minutes: number): string {
  if (minutes === 0) return "UTC";
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

function fixedZone(minutes: number): TimeZone {
  const label = formatOffsetLabel(minutes);
  return { id: label, label, fixedOffsetMinutes: minutes };
}

/** The machine's own zone. */
export function localTimeZone(): TimeZone {
  const id = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return ianaZone(id) ?? fixedZone(0);
}

const LOCAL_ALIASES = new Set(["local", "local time", "here", "me", "my time", "home"]);

/**
 * Abbreviations are inherently ambiguous. These map to the zone most people
 * mean; DST variants resolve to the same region so the offset stays correct.
 */
const ABBREVIATIONS: Record<string, string> = {
  UTC: "UTC",
  UT: "UTC",
  GMT: "UTC",
  Z: "UTC",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  PT: "America/Los_Angeles",
  MST: "America/Denver",
  MDT: "America/Denver",
  MT: "America/Denver",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  CT: "America/Chicago",
  EST: "America/New_York",
  EDT: "America/New_York",
  ET: "America/New_York",
  AKST: "America/Anchorage",
  AKDT: "America/Anchorage",
  HST: "Pacific/Honolulu",
  HAST: "Pacific/Honolulu",
  HADT: "Pacific/Honolulu",
  AST: "America/Halifax",
  ADT: "America/Halifax",
  NST: "America/St_Johns",
  NDT: "America/St_Johns",
  WET: "Europe/Lisbon",
  WEST: "Europe/Lisbon",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  MET: "Europe/Paris",
  MEST: "Europe/Paris",
  EET: "Europe/Athens",
  EEST: "Europe/Athens",
  MSK: "Europe/Moscow",
  TRT: "Europe/Istanbul",
  IST: "Asia/Kolkata",
  PKT: "Asia/Karachi",
  NPT: "Asia/Kathmandu",
  BDT: "Asia/Dhaka",
  MMT: "Asia/Yangon",
  ICT: "Asia/Bangkok",
  WIB: "Asia/Jakarta",
  SGT: "Asia/Singapore",
  MYT: "Asia/Kuala_Lumpur",
  PHT: "Asia/Manila",
  HKT: "Asia/Hong_Kong",
  JST: "Asia/Tokyo",
  KST: "Asia/Seoul",
  ALMT: "Asia/Almaty",
  ULAT: "Asia/Ulaanbaatar",
  AFT: "Asia/Kabul",
  GST: "Asia/Dubai",
  IRST: "Asia/Tehran",
  IRDT: "Asia/Tehran",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
  ACST: "Australia/Adelaide",
  ACDT: "Australia/Adelaide",
  AWST: "Australia/Perth",
  NZST: "Pacific/Auckland",
  NZDT: "Pacific/Auckland",
  CHST: "Pacific/Guam",
  WAT: "Africa/Lagos",
  CAT: "Africa/Harare",
  EAT: "Africa/Nairobi",
  SAST: "Africa/Johannesburg",
  BRT: "America/Sao_Paulo",
  BRST: "America/Sao_Paulo",
  ART: "America/Argentina/Buenos_Aires",
  CLT: "America/Santiago",
  CLST: "America/Santiago",
  COT: "America/Bogota",
  PET: "America/Lima",
  VET: "America/Caracas",
  UYT: "America/Montevideo",
  PYT: "America/Asuncion",
  BOT: "America/La_Paz",
  ECT: "America/Guayaquil",
};

/** City, region and country names people actually type. */
const ALIASES: Record<string, string> = {
  // US & Canada
  sf: "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "bay area": "America/Los_Angeles",
  "silicon valley": "America/Los_Angeles",
  la: "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  portland: "America/Los_Angeles",
  vegas: "America/Los_Angeles",
  "las vegas": "America/Los_Angeles",
  california: "America/Los_Angeles",
  "west coast": "America/Los_Angeles",
  "pacific time": "America/Los_Angeles",
  nyc: "America/New_York",
  ny: "America/New_York",
  "new york": "America/New_York",
  manhattan: "America/New_York",
  boston: "America/New_York",
  dc: "America/New_York",
  "washington dc": "America/New_York",
  washington: "America/New_York",
  miami: "America/New_York",
  atlanta: "America/New_York",
  philadelphia: "America/New_York",
  detroit: "America/New_York",
  "east coast": "America/New_York",
  "eastern time": "America/New_York",
  chicago: "America/Chicago",
  dallas: "America/Chicago",
  houston: "America/Chicago",
  austin: "America/Chicago",
  "kansas city": "America/Chicago",
  minneapolis: "America/Chicago",
  "central time": "America/Chicago",
  texas: "America/Chicago",
  denver: "America/Denver",
  boulder: "America/Denver",
  "salt lake city": "America/Denver",
  "mountain time": "America/Denver",
  phoenix: "America/Phoenix",
  "las vegas nv": "America/Los_Angeles",
  toronto: "America/Toronto",
  montreal: "America/Toronto",
  ottawa: "America/Toronto",
  vancouver: "America/Vancouver",
  calgary: "America/Edmonton",
  edmonton: "America/Edmonton",
  winnipeg: "America/Winnipeg",
  halifax: "America/Halifax",
  "st johns": "America/St_Johns",
  "st john's": "America/St_Johns",
  honolulu: "Pacific/Honolulu",
  hawaii: "Pacific/Honolulu",
  anchorage: "America/Anchorage",
  alaska: "America/Anchorage",
  // Latin America
  "mexico city": "America/Mexico_City",
  "sao paulo": "America/Sao_Paulo",
  "são paulo": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo",
  rio: "America/Sao_Paulo",
  brasilia: "America/Sao_Paulo",
  brazil: "America/Sao_Paulo",
  "buenos aires": "America/Argentina/Buenos_Aires",
  bogota: "America/Bogota",
  bogotá: "America/Bogota",
  lima: "America/Lima",
  santiago: "America/Santiago",
  montevideo: "America/Montevideo",
  caracas: "America/Caracas",
  "panama city": "America/Panama",
  havana: "America/Havana",
  "guatemala city": "America/Guatemala",
  "san jose": "America/Costa_Rica",
  // Europe
  london: "Europe/London",
  uk: "Europe/London",
  england: "Europe/London",
  dublin: "Europe/Dublin",
  ireland: "Europe/Dublin",
  lisbon: "Europe/Lisbon",
  portugal: "Europe/Lisbon",
  paris: "Europe/Paris",
  france: "Europe/Paris",
  berlin: "Europe/Berlin",
  munich: "Europe/Berlin",
  hamburg: "Europe/Berlin",
  frankfurt: "Europe/Berlin",
  germany: "Europe/Berlin",
  rome: "Europe/Rome",
  milan: "Europe/Rome",
  turin: "Europe/Rome",
  florence: "Europe/Rome",
  naples: "Europe/Rome",
  italy: "Europe/Rome",
  madrid: "Europe/Madrid",
  barcelona: "Europe/Madrid",
  spain: "Europe/Madrid",
  amsterdam: "Europe/Amsterdam",
  netherlands: "Europe/Amsterdam",
  brussels: "Europe/Brussels",
  belgium: "Europe/Brussels",
  zurich: "Europe/Zurich",
  geneva: "Europe/Zurich",
  switzerland: "Europe/Zurich",
  vienna: "Europe/Vienna",
  austria: "Europe/Vienna",
  prague: "Europe/Prague",
  warsaw: "Europe/Warsaw",
  poland: "Europe/Warsaw",
  budapest: "Europe/Budapest",
  athens: "Europe/Athens",
  greece: "Europe/Athens",
  bucharest: "Europe/Bucharest",
  sofia: "Europe/Sofia",
  belgrade: "Europe/Belgrade",
  zagreb: "Europe/Zagreb",
  ljubljana: "Europe/Ljubljana",
  sarajevo: "Europe/Sarajevo",
  skopje: "Europe/Skopje",
  tirana: "Europe/Tirane",
  valletta: "Europe/Malta",
  istanbul: "Europe/Istanbul",
  turkey: "Europe/Istanbul",
  moscow: "Europe/Moscow",
  kyiv: "Europe/Kyiv",
  kiev: "Europe/Kyiv",
  stockholm: "Europe/Stockholm",
  oslo: "Europe/Oslo",
  copenhagen: "Europe/Copenhagen",
  helsinki: "Europe/Helsinki",
  tallinn: "Europe/Tallinn",
  riga: "Europe/Riga",
  vilnius: "Europe/Vilnius",
  reykjavik: "Atlantic/Reykjavik",
  // Middle East & Africa
  dubai: "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",
  uae: "Asia/Dubai",
  riyadh: "Asia/Riyadh",
  doha: "Asia/Qatar",
  kuwait: "Asia/Kuwait",
  "tel aviv": "Asia/Jerusalem",
  jerusalem: "Asia/Jerusalem",
  israel: "Asia/Jerusalem",
  cairo: "Africa/Cairo",
  egypt: "Africa/Cairo",
  casablanca: "Africa/Casablanca",
  morocco: "Africa/Casablanca",
  lagos: "Africa/Lagos",
  nigeria: "Africa/Lagos",
  nairobi: "Africa/Nairobi",
  kenya: "Africa/Nairobi",
  johannesburg: "Africa/Johannesburg",
  "cape town": "Africa/Johannesburg",
  "south africa": "Africa/Johannesburg",
  accra: "Africa/Accra",
  // Asia
  karachi: "Asia/Karachi",
  islamabad: "Asia/Karachi",
  pakistan: "Asia/Karachi",
  delhi: "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  bengaluru: "Asia/Kolkata",
  hyderabad: "Asia/Kolkata",
  chennai: "Asia/Kolkata",
  pune: "Asia/Kolkata",
  kolkata: "Asia/Kolkata",
  calcutta: "Asia/Kolkata",
  india: "Asia/Kolkata",
  kathmandu: "Asia/Kathmandu",
  nepal: "Asia/Kathmandu",
  dhaka: "Asia/Dhaka",
  colombo: "Asia/Colombo",
  yangon: "Asia/Yangon",
  bangkok: "Asia/Bangkok",
  thailand: "Asia/Bangkok",
  jakarta: "Asia/Jakarta",
  indonesia: "Asia/Jakarta",
  "kuala lumpur": "Asia/Kuala_Lumpur",
  singapore: "Asia/Singapore",
  manila: "Asia/Manila",
  philippines: "Asia/Manila",
  "hong kong": "Asia/Hong_Kong",
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  shenzhen: "Asia/Shanghai",
  guangzhou: "Asia/Shanghai",
  china: "Asia/Shanghai",
  taipei: "Asia/Taipei",
  tokyo: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
  japan: "Asia/Tokyo",
  seoul: "Asia/Seoul",
  korea: "Asia/Seoul",
  // Oceania
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  perth: "Australia/Perth",
  adelaide: "Australia/Adelaide",
  canberra: "Australia/Sydney",
  australia: "Australia/Sydney",
  auckland: "Pacific/Auckland",
  wellington: "Pacific/Auckland",
  "new zealand": "Pacific/Auckland",
};

type ZoneIndex = {
  byId: Map<string, string>;
  byAlias: Map<string, string>;
};

let index: ZoneIndex | null = null;

function getIndex(): ZoneIndex {
  if (index) return index;
  const byId = new Map<string, string>();
  const byAlias = new Map<string, string>();
  for (const id of allZoneIds()) {
    const lower = id.toLowerCase();
    byId.set(lower, id);
    byId.set(lower.replace(/_/g, " "), id);
    const city = zoneLabel(id).toLowerCase();
    if (!byAlias.has(city)) byAlias.set(city, id);
  }
  for (const [alias, id] of Object.entries(ALIASES)) byAlias.set(alias, id);
  index = { byId, byAlias };
  return index;
}

function parseFixedOffset(text: string): number | null {
  if (/^(utc|gmt|z)$/.test(text)) return 0;
  const match = /^(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/.exec(text);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  if (hours > 14 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  return match[1] === "-" ? -total : total;
}

/**
 * Turns free text into a zone. Accepts IANA ids (`Europe/Rome`), city and
 * country names (`rome`, `italy`), abbreviations (`CET`), fixed offsets
 * (`UTC+2`, `-05:00`) and `local`.
 */
export function resolveZone(input: string, local: TimeZone): TimeZone | null {
  const raw = input.trim().replace(/\s+/g, " ");
  if (!raw) return null;

  let text = raw.toLowerCase();
  text = text.replace(/^(?:in|at|to|from)\s+/, "").trim();
  text = text.replace(/[?.!,]+$/, "").trim();
  if (!text) return null;

  if (LOCAL_ALIASES.has(text)) return local;

  const offset = parseFixedOffset(text);
  if (offset !== null) return fixedZone(offset);

  const { byId, byAlias } = getIndex();

  const direct = byId.get(text) ?? byId.get(text.replace(/\s+/g, "_"));
  if (direct) return ianaZone(direct);

  const alias = byAlias.get(text);
  if (alias) return ianaZone(alias);

  const abbreviation = ABBREVIATIONS[raw.toUpperCase().replace(/[.\s]/g, "")];
  if (abbreviation) return ianaZone(abbreviation);

  // Last resort: a unique prefix of a known name, so "amster" finds Amsterdam.
  if (text.length >= 3) {
    const matches = new Set<string>();
    for (const [key, id] of byAlias) {
      if (key.startsWith(text)) matches.add(id);
    }
    if (matches.size === 1) return ianaZone([...matches][0]);
  }

  return null;
}
