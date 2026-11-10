import { BBAN_LAYOUTS } from "./bban-spec";
import { extractBbanParts, findKnownBank } from "./bban-parts";
import { getCountry } from "./countries";
import type { GeneratedIban } from "./types";
import { compactIban, formatIban } from "./validate";

export function parseIban(iban: string): GeneratedIban {
  const compact = compactIban(iban);
  if (compact.length < 4) {
    throw new Error("IBAN is too short to parse");
  }
  const parsedCountry = compact.slice(0, 2);
  const country = getCountry(parsedCountry);
  if (!country) {
    throw new Error(`Unsupported country: ${parsedCountry}`);
  }
  if (compact.length !== country.ibanLength) {
    throw new Error(`Invalid IBAN length for ${parsedCountry}: expected ${country.ibanLength}, got ${compact.length}`);
  }
  const layout = BBAN_LAYOUTS[country.code];
  if (!layout) {
    throw new Error(`Unsupported country: ${parsedCountry}`);
  }
  const checkDigits = compact.slice(2, 4);
  const bban = compact.slice(4);
  if (bban.length !== layout.bbanLength) {
    throw new Error(`Invalid BBAN length for ${parsedCountry}`);
  }
  const parts = extractBbanParts(country.code, bban);
  const bank = findKnownBank(country, bban, parts.bankCode, parts.branchCode);

  return {
    iban: compact,
    formatted: formatIban(compact),
    countryCode: country.code,
    countryName: country.name,
    flag: country.flag,
    sepa: country.sepa,
    checkDigits,
    bban,
    bankCode: parts.bankCode,
    branchCode: parts.branchCode,
    accountNumber: parts.accountNumber,
    bankName: bank?.name,
    bic: bank?.bic,
  };
}
