import { accountNumberFromBban, BBAN_LAYOUTS } from "./bban-spec";
import type { Country } from "./types";
import type { Bank } from "./types";

export function extractBbanParts(
  countryCode: string,
  bban: string,
): { bankCode: string; branchCode?: string; accountNumber: string } {
  const layout = BBAN_LAYOUTS[countryCode];
  if (!layout) {
    throw new Error(`Unsupported country: ${countryCode}`);
  }
  const bankCode =
    layout.bankLength === 0 ? "" : bban.substring(layout.bankStart, layout.bankStart + layout.bankLength);
  const branchCode =
    layout.branchStart !== undefined && layout.branchLength
      ? bban.substring(layout.branchStart, layout.branchStart + layout.branchLength)
      : undefined;
  const accountNumber = accountNumberFromBban(countryCode, bban);
  return { bankCode, branchCode, accountNumber };
}

export function findKnownBank(country: Country, bban: string, bankCode: string, branchCode?: string): Bank | undefined {
  const exact = country.banks.find((b) => b.bankCode === bankCode);
  if (exact) {
    return exact;
  }
  const byBban = country.banks.find((b) => bban.includes(b.bankCode));
  if (!byBban) {
    return undefined;
  }
  if (branchCode && byBban.branchCode && byBban.branchCode !== branchCode) {
    return undefined;
  }
  return byBban;
}
