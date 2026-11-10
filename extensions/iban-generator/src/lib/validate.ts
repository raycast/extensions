import { BBAN_LAYOUTS, type NationalCheck } from "./bban-spec";
import {
  expandIbanChars,
  isValidBelgianBban,
  isValidCroatianBban,
  isValidCzechSlovakBban,
  isValidEstonianBban,
  isValidFrenchBban,
  isValidHungarianBban,
  isValidMod9710Bban,
  isValidNorwayBban,
  isValidPolandBban,
  isValidSpainBban,
  isValidDutchElfproefBban,
  isValidFinnishLuhnBban,
  isValidItalianCinBban,
  mod9710,
} from "./checksum";
import { COUNTRIES } from "./countries";
import type { IbanIssue } from "./types";

const SUPPORTED = new Set(COUNTRIES.map((c) => c.code));

function nationalValid(countryCode: string, bban: string): boolean {
  const layout = BBAN_LAYOUTS[countryCode];
  if (!layout) {
    return false;
  }
  const kind: NationalCheck = layout.nationalCheck;
  switch (kind) {
    case "mod9710":
      return isValidMod9710Bban(bban);
    case "belgian":
      return isValidBelgianBban(bban);
    case "norway":
      return isValidNorwayBban(bban);
    case "poland":
      return isValidPolandBban(bban);
    case "spain":
      return isValidSpainBban(bban);
    case "france":
      return isValidFrenchBban(bban);
    case "croatia":
      return isValidCroatianBban(bban);
    case "czech":
      return isValidCzechSlovakBban(bban);
    case "estonia":
      return isValidEstonianBban(bban);
    case "hungary":
      return isValidHungarianBban(bban);
    case "italy":
      return isValidItalianCinBban(bban);
    case "finland":
      return isValidFinnishLuhnBban(bban);
    case "netherlands":
      return isValidDutchElfproefBban(bban);
    default:
      return true;
  }
}

export function compactIban(iban: string): string {
  return iban.replace(/[\s-]/g, "").toUpperCase();
}

export function formatIban(iban: string): string {
  const compact = compactIban(iban);
  return compact.replace(/(.{4})(?!$)/g, "$1 ");
}

export function checkIban(iban: string): IbanIssue | undefined {
  const compact = compactIban(iban);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(compact)) {
    return "malformed";
  }
  const countryCode = compact.slice(0, 2);
  if (!SUPPORTED.has(countryCode)) {
    return "unknown-country";
  }
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country || compact.length !== country.ibanLength) {
    return "length";
  }
  const layout = BBAN_LAYOUTS[countryCode];
  if (!layout) {
    return "unknown-country";
  }
  const bban = compact.slice(4);
  if (bban.length !== layout.bbanLength || !layout.bbanRegexp.test(bban)) {
    return "structure";
  }
  const validationString = expandIbanChars(`${bban}${countryCode}00`);
  const remainder = mod9710(validationString);
  const provided = parseInt(compact.slice(2, 4), 10);
  if (98 - remainder !== provided) {
    return "checksum";
  }
  if (!nationalValid(countryCode, bban)) {
    return "national-check";
  }
  return undefined;
}

export function isValidIban(iban: string): boolean {
  return checkIban(iban) === undefined;
}
