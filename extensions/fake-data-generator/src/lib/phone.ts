import { CountryCode, getExampleNumber, parsePhoneNumberFromString, PhoneNumber } from "libphonenumber-js/max";
import examples from "libphonenumber-js/mobile/examples";
import { digits, int, pick } from "./random";
import { Generated } from "./types";

export type PhoneKind = "mobile" | "landline";
export type PhoneMode = "fictional" | "valid";

export interface PhoneResult extends Generated {
  /** Number comes from a regulator-reserved fictional range (will never reach a real subscriber). */
  fictional: boolean;
  /** Passes libphonenumber validation. */
  valid: boolean;
}

/**
 * Regulator-reserved ranges for films/TV/books. Each entry yields a national-format number; X = random digit.
 * Sources: NANPA 555 line numbers, Ofcom "numbers for drama", ComReg 15/136R4, ACMA, ARCEP plan, BNetzA
 * Mitteilung 148/2021, PTS, Nkom.
 */
const FICTIONAL: Partial<Record<CountryCode, Partial<Record<PhoneKind, string[]>>>> = {
  US: {
    mobile: ["20155501XX", "21255501XX", "31255501XX", "41555501XX", "61755501XX", "70255501XX", "91755501XX"],
    landline: ["20255501XX", "21355501XX", "30555501XX", "51255501XX", "64655501XX", "71855501XX"],
  },
  CA: {
    mobile: ["41655501XX", "60455501XX", "51455501XX"],
    landline: ["40355501XX", "61355501XX", "90255501XX"],
  },
  GB: {
    mobile: ["07700900XXX"],
    landline: [
      "02079460XXX",
      "01134960XXX",
      "01214960XXX",
      "01314960XXX",
      "01414960XXX",
      "01514960XXX",
      "01614960XXX",
      "01914980XXX",
      "02920180XXX",
      "02896496XXX",
    ],
  },
  IE: { mobile: ["0890110XXX"] },
  AU: {
    mobile: [
      "0491570006",
      "0491570156",
      "0491570157",
      "0491570158",
      "0491570159",
      "0491570110",
      "0491570313",
      "0491570737",
      "0491571266",
      "0491571491",
      "0491571804",
      "0491572549",
      "0491572665",
      "0491572983",
      "0491573770",
      "0491573087",
      "0491574118",
      "0491574632",
      "0491575254",
      "0491575789",
      "0491576398",
      "0491576801",
      "0491577426",
      "0491577644",
      "0491578957",
      "0491578148",
      "0491578888",
      "0491579212",
      "0491579760",
      "0491579455",
    ],
    landline: ["025550XXXX", "035550XXXX", "075550XXXX", "085550XXXX", "027010XXXX", "037010XXXX"],
  },
  FR: {
    mobile: ["063998XXXX"],
    landline: ["019900XXXX", "026191XXXX", "035301XXXX", "046571XXXX", "053649XXXX"],
  },
  DE: {
    mobile: ["017139200XX", "0176040690XX"],
    landline: ["03023125XXX", "06990009XXX", "04066969XXX", "02214710XXX", "08999998XXX"],
  },
  SE: {
    // PTS reserves 070-174 06 05 … 070-174 06 99.
    mobile: ["07017406XX"],
    landline: ["08465004XX", "03139006XX", "04062804XX", "09803192XX"],
  },
  NO: { landline: ["6805XXXX"] },
};

/**
 * Real geographic area codes (national significant number, without trunk 0; X = random digit) for countries
 * without a reserved fictional landline range. Starting from a known area code makes a valid hit near-certain,
 * instead of relying on random digit strings.
 */
export const LANDLINE_SEEDS: Partial<Record<CountryCode, string[]>> = {
  BE: ["2XXXXXXX", "3XXXXXXX", "9XXXXXXX"],
  NL: ["20XXXXXXX", "10XXXXXXX", "70XXXXXXX"],
  LU: ["27XXXXXX", "26XXXXXX"],
  IE: ["1XXXXXXX", "21XXXXXXX"],
  NZ: ["9XXXXXXX", "4XXXXXXX", "3XXXXXXX"],
  AT: ["1XXXXXXX", "316XXXXXX"],
  CH: ["44XXXXXXX", "22XXXXXXX", "31XXXXXXX"],
  ES: ["91XXXXXXX", "93XXXXXXX"],
  IT: ["06XXXXXXXX", "02XXXXXXXX"],
  PT: ["21XXXXXXX", "22XXXXXXX"],
  DK: ["33XXXXXX", "86XXXXXX"],
  FI: ["9XXXXXXX", "2XXXXXXX"],
  PL: ["22XXXXXXX", "12XXXXXXX"],
  CZ: ["2XXXXXXXX"],
  SK: ["2XXXXXXXX"],
  HU: ["1XXXXXXX"],
  RO: ["21XXXXXXX"],
  BG: ["2XXXXXXX"],
  HR: ["1XXXXXXX"],
  SI: ["1XXXXXXX"],
  GR: ["21XXXXXXXX"],
  CY: ["22XXXXXX"],
  MT: ["21XXXXXX"],
  EE: ["6XXXXXX"],
  LV: ["67XXXXXX"],
  LT: ["52XXXXXX"],
  IS: ["5XXXXXX"],
};

function fill(pattern: string): string {
  return pattern.replace(/X/g, () => String(int(0, 9)));
}

function fromFictional(country: CountryCode, kind: PhoneKind): PhoneNumber | undefined {
  const patterns = FICTIONAL[country]?.[kind];
  if (!patterns) return undefined;
  for (let i = 0; i < 50; i++) {
    const national = fill(pick(patterns));
    // Sweden: only 070-174 06 05 … 99 are reserved.
    if (country === "SE" && kind === "mobile" && Number(national.slice(-2)) < 5) continue;
    const parsed = parsePhoneNumberFromString(national, country);
    if (parsed) return parsed;
  }
  return undefined;
}

function matchesKind(number: PhoneNumber, kind: PhoneKind): boolean {
  const type = number.getType();
  if (kind === "mobile") return type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE";
  return type === "FIXED_LINE" || type === "FIXED_LINE_OR_MOBILE";
}

/** Random number that passes libphonenumber validation for the requested type. */
function randomValid(country: CountryCode, kind: PhoneKind): PhoneNumber | undefined {
  const example = getExampleNumber(country, examples);
  if (!example) return undefined;
  const nsn = example.nationalNumber as string;

  if (kind === "mobile") {
    // Keep the mobile prefix of the example and randomize the subscriber part.
    for (let keep = Math.min(2, nsn.length - 4); keep <= nsn.length - 2; keep++) {
      for (let i = 0; i < 60; i++) {
        const candidate = nsn.slice(0, keep) + digits(nsn.length - keep);
        const parsed = parsePhoneNumberFromString(`+${example.countryCallingCode}${candidate}`);
        if (parsed?.isValid() && matchesKind(parsed, kind)) return parsed;
      }
    }
    return example;
  }

  const seeds = LANDLINE_SEEDS[country];
  if (seeds) {
    for (let i = 0; i < 200; i++) {
      const parsed = parsePhoneNumberFromString(`+${example.countryCallingCode}${fill(pick(seeds))}`);
      if (parsed?.isValid() && matchesKind(parsed, kind)) return parsed;
    }
  }

  // Last resort: brute force around the mobile length; validation is cheap. Some plans (IT) start landlines with 0.
  for (let i = 0; i < 4000; i++) {
    const candidate = digits(nsn.length + int(-2, 1));
    const parsed = parsePhoneNumberFromString(`+${example.countryCallingCode}${candidate}`);
    if (parsed?.isValid() && matchesKind(parsed, kind)) return parsed;
  }
  return undefined;
}

export function generatePhone(
  country: CountryCode,
  kind: PhoneKind,
  mode: PhoneMode = "fictional",
): PhoneResult | undefined {
  let number = fromFictional(country, kind);
  let fictional = !!number;
  if (number && mode === "valid" && !number.isValid()) {
    number = undefined;
    fictional = false;
  }
  number ??= randomValid(country, kind);
  if (!number) return undefined;

  const valid = number.isValid();
  const e164 = number.number as string;
  const international = number.formatInternational();
  const national = number.formatNational();
  return {
    compact: e164,
    formatted: international,
    fictional,
    valid,
    variants: [
      { label: "National format", value: national },
      { label: "Digits only", value: e164.replace(/\D/g, "") },
    ],
    fields: [
      { label: "E.164", value: e164 },
      { label: "International", value: international },
      { label: "National", value: national },
      { label: "Type", value: number.getType() ?? "unknown" },
      {
        label: "Source",
        value: fictional ? "Regulator-reserved fictional range" : "Random number in a valid range (could be in use!)",
      },
      { label: "Passes libphonenumber", value: valid ? "Yes" : "No (reserved range not in Google metadata)" },
    ],
  };
}

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  keywords: string[];
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "BE", name: "Belgium", keywords: ["belgië", "belgique"] },
  { code: "NL", name: "Netherlands", keywords: ["nederland", "holland"] },
  { code: "DE", name: "Germany", keywords: ["deutschland"] },
  { code: "FR", name: "France", keywords: [] },
  { code: "LU", name: "Luxembourg", keywords: [] },
  { code: "GB", name: "United Kingdom", keywords: ["uk", "england", "britain"] },
  { code: "IE", name: "Ireland", keywords: ["éire"] },
  { code: "US", name: "United States", keywords: ["usa", "america"] },
  { code: "CA", name: "Canada", keywords: [] },
  { code: "AU", name: "Australia", keywords: [] },
  { code: "NZ", name: "New Zealand", keywords: ["aotearoa"] },
  { code: "AT", name: "Austria", keywords: ["österreich"] },
  { code: "CH", name: "Switzerland", keywords: ["schweiz", "suisse"] },
  { code: "ES", name: "Spain", keywords: ["españa"] },
  { code: "IT", name: "Italy", keywords: ["italia"] },
  { code: "PT", name: "Portugal", keywords: [] },
  { code: "DK", name: "Denmark", keywords: ["danmark"] },
  { code: "SE", name: "Sweden", keywords: ["sverige"] },
  { code: "NO", name: "Norway", keywords: ["norge"] },
  { code: "FI", name: "Finland", keywords: ["suomi"] },
  { code: "PL", name: "Poland", keywords: ["polska"] },
  { code: "CZ", name: "Czechia", keywords: ["česko"] },
  { code: "SK", name: "Slovakia", keywords: [] },
  { code: "HU", name: "Hungary", keywords: ["magyarország"] },
  { code: "RO", name: "Romania", keywords: [] },
  { code: "BG", name: "Bulgaria", keywords: [] },
  { code: "HR", name: "Croatia", keywords: ["hrvatska"] },
  { code: "SI", name: "Slovenia", keywords: [] },
  { code: "GR", name: "Greece", keywords: ["hellas"] },
  { code: "CY", name: "Cyprus", keywords: [] },
  { code: "MT", name: "Malta", keywords: [] },
  { code: "EE", name: "Estonia", keywords: ["eesti"] },
  { code: "LV", name: "Latvia", keywords: [] },
  { code: "LT", name: "Lithuania", keywords: [] },
  { code: "IS", name: "Iceland", keywords: [] },
];
