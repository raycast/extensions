/**
 * Static timezone maps: abbreviations, city names, and short forms → IANA identifiers.
 * All keys are stored lowercase for case-insensitive matching.
 */

/** Common timezone abbreviations → IANA identifier(s). Ambiguous ones map to multiple. */
export const ABBREVIATION_MAP: Record<string, string[]> = {
  // UTC / GMT
  utc: ["UTC"],
  gmt: ["Etc/GMT"],

  // North America
  est: ["America/New_York"],
  edt: ["America/New_York"],
  cst: ["America/Chicago", "Asia/Shanghai"],
  cdt: ["America/Chicago"],
  mst: ["America/Denver"],
  mdt: ["America/Denver"],
  pst: ["America/Los_Angeles"],
  pdt: ["America/Los_Angeles"],
  akst: ["America/Anchorage"],
  akdt: ["America/Anchorage"],
  hst: ["Pacific/Honolulu"],
  ast: ["America/Halifax", "Asia/Riyadh"],
  nst: ["America/St_Johns"],
  ndt: ["America/St_Johns"],

  // Europe
  cet: ["Europe/Berlin"],
  cest: ["Europe/Berlin"],
  eet: ["Europe/Bucharest"],
  eest: ["Europe/Bucharest"],
  wet: ["Europe/Lisbon"],
  west: ["Europe/Lisbon"],
  gmt_plus_1: ["Europe/London"],
  bst: ["Europe/London", "Asia/Dhaka"],
  ist: ["Asia/Kolkata", "Asia/Jerusalem", "Europe/Dublin"],
  msk: ["Europe/Moscow"],

  // Asia
  jst: ["Asia/Tokyo"],
  kst: ["Asia/Seoul"],
  cst_china: ["Asia/Shanghai"],
  hkt: ["Asia/Hong_Kong"],
  sgt: ["Asia/Singapore"],
  myt: ["Asia/Kuala_Lumpur"],
  pht: ["Asia/Manila"],
  wib: ["Asia/Jakarta"],
  wit: ["Asia/Jayapura"],
  wita: ["Asia/Makassar"],
  ict: ["Asia/Bangkok"],
  mmt: ["Asia/Yangon"],
  npt: ["Asia/Kathmandu"],
  pkt: ["Asia/Karachi"],
  aft: ["Asia/Kabul"],
  irst: ["Asia/Tehran"],
  gst: ["Asia/Dubai"],
  aqtt: ["Asia/Aqtau"],

  // Australia / Pacific
  aest: ["Australia/Sydney"],
  aedt: ["Australia/Sydney"],
  acst: ["Australia/Adelaide"],
  acdt: ["Australia/Adelaide"],
  awst: ["Australia/Perth"],
  nzst: ["Pacific/Auckland"],
  nzdt: ["Pacific/Auckland"],
  fjt: ["Pacific/Fiji"],

  // South America
  brt: ["America/Sao_Paulo"],
  brst: ["America/Sao_Paulo"],
  art: ["America/Argentina/Buenos_Aires"],
  clt: ["America/Santiago"],
  clst: ["America/Santiago"],
  pet: ["America/Lima"],
  cot: ["America/Bogota"],
  vet: ["America/Caracas"],

  // Africa
  cat: ["Africa/Harare"],
  eat: ["Africa/Nairobi"],
  wat: ["Africa/Lagos"],
  sast: ["Africa/Johannesburg"],
};

/** City / region names → IANA identifier. All keys lowercase. */
export const CITY_MAP: Record<string, string> = {
  // North America
  "new york": "America/New_York",
  chicago: "America/Chicago",
  denver: "America/Denver",
  "los angeles": "America/Los_Angeles",
  phoenix: "America/Phoenix",
  anchorage: "America/Anchorage",
  honolulu: "Pacific/Honolulu",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  montreal: "America/Toronto",
  halifax: "America/Halifax",
  "st johns": "America/St_Johns",
  "mexico city": "America/Mexico_City",

  // Europe
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  amsterdam: "Europe/Amsterdam",
  brussels: "Europe/Brussels",
  madrid: "Europe/Madrid",
  rome: "Europe/Rome",
  zurich: "Europe/Zurich",
  vienna: "Europe/Vienna",
  prague: "Europe/Prague",
  warsaw: "Europe/Warsaw",
  budapest: "Europe/Budapest",
  bucharest: "Europe/Bucharest",
  athens: "Europe/Athens",
  istanbul: "Europe/Istanbul",
  moscow: "Europe/Moscow",
  helsinki: "Europe/Helsinki",
  stockholm: "Europe/Stockholm",
  oslo: "Europe/Oslo",
  copenhagen: "Europe/Copenhagen",
  dublin: "Europe/Dublin",
  lisbon: "Europe/Lisbon",
  kyiv: "Europe/Kyiv",

  // Asia
  tokyo: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
  seoul: "Asia/Seoul",
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  taipei: "Asia/Taipei",
  singapore: "Asia/Singapore",
  "kuala lumpur": "Asia/Kuala_Lumpur",
  bangkok: "Asia/Bangkok",
  jakarta: "Asia/Jakarta",
  manila: "Asia/Manila",
  delhi: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  kolkata: "Asia/Kolkata",
  chennai: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  karachi: "Asia/Karachi",
  lahore: "Asia/Karachi",
  dhaka: "Asia/Dhaka",
  kathmandu: "Asia/Kathmandu",
  yangon: "Asia/Yangon",
  tehran: "Asia/Tehran",
  dubai: "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",
  riyadh: "Asia/Riyadh",
  doha: "Asia/Qatar",
  jerusalem: "Asia/Jerusalem",
  "tel aviv": "Asia/Jerusalem",
  kabul: "Asia/Kabul",
  colombo: "Asia/Colombo",

  // Australia / Pacific
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  perth: "Australia/Perth",
  adelaide: "Australia/Adelaide",
  auckland: "Pacific/Auckland",
  wellington: "Pacific/Auckland",
  fiji: "Pacific/Fiji",

  // South America
  "sao paulo": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo",
  "buenos aires": "America/Argentina/Buenos_Aires",
  santiago: "America/Santiago",
  lima: "America/Lima",
  bogota: "America/Bogota",
  caracas: "America/Caracas",

  // Africa
  cairo: "Africa/Cairo",
  lagos: "Africa/Lagos",
  nairobi: "Africa/Nairobi",
  johannesburg: "Africa/Johannesburg",
  "cape town": "Africa/Johannesburg",
  casablanca: "Africa/Casablanca",
  accra: "Africa/Accra",
  "addis ababa": "Africa/Addis_Ababa",
};

/** Common short-form aliases → IANA identifier. */
export const SHORT_FORM_MAP: Record<string, string> = {
  ny: "America/New_York",
  nyc: "America/New_York",
  la: "America/Los_Angeles",
  sf: "America/Los_Angeles",
  chi: "America/Chicago",
  kl: "Asia/Kuala_Lumpur",
  hk: "Asia/Hong_Kong",
  sg: "Asia/Singapore",
};

/** Full names for disambiguation of ambiguous abbreviations. */
export const TIMEZONE_FULL_NAMES: Record<string, string> = {
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "Asia/Shanghai": "China Standard Time",
  "Asia/Kolkata": "India Standard Time",
  "Asia/Jerusalem": "Israel Standard Time",
  "Europe/Dublin": "Irish Standard Time",
  "Europe/London": "British Summer Time",
  "Asia/Dhaka": "Bangladesh Standard Time",
  "America/Halifax": "Atlantic Time",
  "Asia/Riyadh": "Arabia Standard Time",
};

/**
 * Validate that an IANA timezone identifier is recognized by the runtime.
 */
export function isValidIana(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
