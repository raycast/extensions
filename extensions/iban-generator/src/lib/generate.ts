import { BBAN_LAYOUTS } from "./bban-spec";
import { generateBban } from "./bban-spec";
import { computeIbanCheckDigits } from "./checksum";
import { getCountry } from "./countries";
import type { Bank, GenerateOptions, GeneratedIban } from "./types";
import { formatIban } from "./validate";
import { pickRandom, randomString } from "./random";

function selectBank(banks: Bank[], bankCode?: string): { bank?: Bank; bankCode?: string; branchCode?: string } {
  if (bankCode) {
    const bank = banks.find((b) => b.bankCode === bankCode);
    if (!bank) {
      throw new Error(`Unknown bank code "${bankCode}" for this country`);
    }
    return {
      bank,
      bankCode: bank.bankCode,
      branchCode: bank.branchCode,
    };
  }
  if (banks.length > 0) {
    const bank = pickRandom(banks);
    return {
      bank,
      bankCode: bank.bankCode,
      branchCode: bank.branchCode,
    };
  }
  return {};
}

function randomBankCode(layout: (typeof BBAN_LAYOUTS)[string]): string {
  if (layout.bankLength === 0) {
    return "";
  }
  const charset = layout.bankCharset;
  if (charset === "digit") {
    let code = randomString(layout.bankLength, "digit");
    if (code.charAt(0) === "0" && layout.bankLength > 1) {
      code = String(Math.floor(1 + Math.random() * 9)) + code.slice(1);
    }
    return code;
  }
  return randomString(layout.bankLength, charset);
}

export function generateIban(options: GenerateOptions): GeneratedIban {
  const country = getCountry(options.countryCode);
  if (!country) {
    throw new Error(`Unsupported country: ${options.countryCode}`);
  }
  const layout = BBAN_LAYOUTS[country.code];
  if (!layout) {
    throw new Error(`Unsupported country: ${options.countryCode}`);
  }

  const { bank, bankCode: selectedCode, branchCode: selectedBranch } = selectBank(country.banks, options.bankCode);

  const bankCode = selectedCode ?? randomBankCode(layout);
  const branchCode = selectedBranch ?? bank?.branchCode;

  const parts = generateBban({
    layout,
    bankCode,
    branchCode,
    knownBank: bank,
  });

  const checkDigits = computeIbanCheckDigits(country.code, parts.bban);
  const iban = `${country.code}${checkDigits}${parts.bban}`;

  return {
    iban,
    formatted: formatIban(iban),
    countryCode: country.code,
    countryName: country.name,
    flag: country.flag,
    sepa: country.sepa,
    checkDigits,
    bban: parts.bban,
    bankCode: parts.bankCode || bankCode,
    branchCode: parts.branchCode,
    accountNumber: parts.accountNumber,
    bankName: bank?.name,
    bic: bank?.bic,
  };
}
