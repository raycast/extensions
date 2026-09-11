import { parsePhoneNumberFromString } from "libphonenumber-js/min";

const REGIONAL_INDICATOR_A = 0x1f1e6;

export function formatDisplay(normalized: string): string {
  const parsed = parsePhoneNumberFromString(normalized);
  return parsed?.formatInternational() ?? normalized;
}

export function getCountryFlag(normalized: string): string | undefined {
  const parsed = parsePhoneNumberFromString(normalized);
  const iso = parsed?.country;
  if (!iso) return undefined;
  const upper = iso.toUpperCase();
  if (upper.length !== 2) return undefined;
  const code1 = REGIONAL_INDICATOR_A + (upper.charCodeAt(0) - 65);
  const code2 = REGIONAL_INDICATOR_A + (upper.charCodeAt(1) - 65);
  return String.fromCodePoint(code1, code2);
}
