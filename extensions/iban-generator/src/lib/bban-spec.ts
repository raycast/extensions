import type { Bank } from "./types";
import type { Charset } from "./random";
import {
  appendMod9710BbanCheck,
  computeBelgianCheckDigits,
  computeCzechPrefixCheck,
  computeCzechSuffixCheck,
  computeEstonianCheck,
  computeFrenchRibKey,
  computeHungarianAccountCheck,
  computeHungarianBankBranchCheck,
  computeNorwayControlDigit,
  computePolandBankBranchCheckDigit,
  computeSpanishCheckDigits,
  computeFinnishLuhnCheckDigit,
  computeItalianCin,
  appendDutchElfproefCheckDigit,
  mod1110Control,
} from "./checksum";
import { randomDigits, randomString } from "./random";

export type NationalCheck =
  | "none"
  | "mod9710"
  | "belgian"
  | "norway"
  | "poland"
  | "spain"
  | "france"
  | "croatia"
  | "czech"
  | "estonia"
  | "hungary"
  | "italy"
  | "finland"
  | "netherlands";

export interface BbanLayout {
  bbanLength: number;
  bankStart: number;
  bankLength: number;
  bankCharset: Charset;
  branchStart?: number;
  branchLength?: number;
  branchCharset?: Charset;
  accountStart: number;
  accountLength: number;
  accountCharset: Charset;
  nationalCheck: NationalCheck;
  bbanRegexp: RegExp;
  /** Extra fixed characters (e.g. Italian CIN at position 0). */
  prefixUpper?: boolean;
}

export interface GenerateBbanInput {
  layout: BbanLayout;
  bankCode?: string;
  branchCode?: string;
  knownBank?: Bank;
}

function charsetCheck(value: string, charset: Charset): boolean {
  if (charset === "digit") {
    return /^[0-9]+$/.test(value);
  }
  if (charset === "upper") {
    return /^[A-Z]+$/.test(value);
  }
  return /^[A-Z0-9]+$/.test(value);
}

function requireField(value: string | undefined, length: number, charset: Charset, label: string): string {
  const v = (value ?? randomString(length, charset)).toUpperCase();
  if (v.length !== length) {
    throw new Error(`${label} must be ${length} characters, got ${v.length}`);
  }
  if (!charsetCheck(v, charset)) {
    throw new Error(`${label} has invalid characters for charset ${charset}`);
  }
  return v;
}

function placeSegments(layout: BbanLayout, segments: { start: number; value: string }[]): string {
  const buf = new Array<string>(layout.bbanLength).fill("0");
  for (const { start, value } of segments) {
    for (let i = 0; i < value.length; i++) {
      buf[start + i] = value.charAt(i);
    }
  }
  return buf.join("");
}

export function generateBban(input: GenerateBbanInput): {
  bban: string;
  bankCode: string;
  branchCode?: string;
  accountNumber: string;
} {
  const { layout, knownBank } = input;
  const bankCode =
    layout.bankLength === 0
      ? ""
      : requireField(input.bankCode ?? knownBank?.bankCode, layout.bankLength, layout.bankCharset, "bankCode");
  const branchCode =
    layout.branchLength !== undefined && layout.branchStart !== undefined
      ? requireField(
          input.branchCode ?? knownBank?.branchCode,
          layout.branchLength,
          layout.branchCharset ?? "digit",
          "branchCode",
        )
      : undefined;

  let bban: string;
  let accountNumber: string;

  switch (layout.nationalCheck) {
    case "italy": {
      const abi = bankCode.padEnd(5, "0").substring(0, 5);
      const cab = (branchCode ?? randomDigits(5)).padEnd(5, "0").substring(0, 5);
      const account = randomString(12, "alnum");
      const body = abi + cab + account;
      const cin = computeItalianCin(body);
      bban = cin + body;
      accountNumber = account;
      break;
    }
    case "finland": {
      const inst = bankCode.padStart(3, "0").substring(0, 3);
      const first13 = inst + randomDigits(10);
      const luhn = computeFinnishLuhnCheckDigit(first13);
      bban = first13 + luhn;
      accountNumber = bban.substring(3, 14);
      break;
    }
    case "netherlands": {
      const bank = bankCode.toUpperCase().padEnd(4, "X").substring(0, 4);
      let account: string | undefined;
      for (let attempt = 0; attempt < 200; attempt++) {
        const partial = randomDigits(9);
        if (/^0+$/.test(partial)) {
          continue;
        }
        try {
          account = appendDutchElfproefCheckDigit(partial);
          break;
        } catch {
          /* retry */
        }
      }
      if (!account) {
        throw new Error("Failed to generate Dutch account number");
      }
      bban = bank + account;
      accountNumber = account;
      break;
    }
    case "belgian": {
      const base = bankCode + randomDigits(10 - bankCode.length);
      const check = computeBelgianCheckDigits(base);
      bban = base + check;
      accountNumber = bban.substring(layout.accountStart, layout.accountStart + layout.accountLength);
      break;
    }
    case "norway": {
      let generated: string | undefined;
      for (let attempt = 0; attempt < 100; attempt++) {
        const first10 = bankCode + randomDigits(10 - bankCode.length);
        const ctrl = computeNorwayControlDigit(first10);
        if (ctrl.length > 1) {
          continue;
        }
        generated = first10 + ctrl;
        break;
      }
      if (!generated) {
        throw new Error("Failed to generate Norwegian BBAN");
      }
      bban = generated;
      accountNumber = bban.substring(4, 11);
      break;
    }
    case "poland": {
      let eight: string;
      if (bankCode.length === 8 && computePolandBankBranchCheckDigit(bankCode.substring(0, 7)) === bankCode.charAt(7)) {
        eight = bankCode;
      } else {
        let seven = bankCode;
        if (seven.length > 7) {
          seven = seven.substring(0, 7);
        }
        if (seven.length < 7) {
          seven = seven + randomDigits(7 - seven.length);
        }
        eight = seven + computePolandBankBranchCheckDigit(seven);
      }
      const tail = randomDigits(16);
      bban = eight + tail;
      accountNumber = tail;
      break;
    }
    case "spain": {
      const bank4 = bankCode.padStart(4, "0").substring(0, 4);
      const branch4 = (branchCode ?? randomDigits(4)).padEnd(4, "0").substring(0, 4);
      const bankBranch8 = bank4 + branch4;
      const account = randomDigits(10);
      const checks = computeSpanishCheckDigits(bankBranch8, account);
      bban = bankBranch8 + checks + account;
      accountNumber = account;
      break;
    }
    case "france": {
      const bank5 = bankCode.padEnd(5, "0").substring(0, 5);
      const branch5 = (branchCode ?? randomDigits(5)).padEnd(5, "0").substring(0, 5);
      const acc11 = randomString(11, "alnum");
      const key = computeFrenchRibKey(bank5 + branch5 + acc11);
      bban = bank5 + branch5 + acc11 + key;
      accountNumber = acc11;
      break;
    }
    case "croatia": {
      const bank6 = bankCode.padStart(6, "0").substring(0, 6);
      const cBank = mod1110Control(bank6);
      const acc9 = randomDigits(9);
      const cAcc = mod1110Control(acc9);
      bban = bank6 + String(cBank) + acc9 + String(cAcc);
      accountNumber = acc9;
      break;
    }
    case "czech": {
      const bank4 = bankCode.padStart(4, "0").substring(0, 4);
      const prefix5 = randomDigits(5);
      const pCheck = computeCzechPrefixCheck(prefix5);
      const suffix9 = randomDigits(9);
      const sCheck = computeCzechSuffixCheck(suffix9);
      bban = bank4 + prefix5 + pCheck + suffix9 + sCheck;
      accountNumber = suffix9;
      break;
    }
    case "estonia": {
      const inst2 = bankCode.padStart(2, "0").substring(0, 2);
      const first15 = inst2 + randomDigits(13);
      const check = computeEstonianCheck(first15);
      bban = first15 + check;
      accountNumber = bban.substring(2, 16);
      break;
    }
    case "hungary": {
      const bank3 = bankCode.padStart(3, "0").substring(0, 3);
      const branch4 = (branchCode ?? randomDigits(4)).padEnd(4, "0").substring(0, 4);
      const bankBranch7 = bank3 + branch4;
      const bbCheck = computeHungarianBankBranchCheck(bankBranch7);
      const usePadding = Math.random() < 0.5;
      if (usePadding) {
        const acc = randomDigits(7);
        const ac = computeHungarianAccountCheck(acc, true);
        bban = bankBranch7 + bbCheck + acc + ac + "00000000";
        accountNumber = acc;
      } else {
        const acc = randomDigits(15);
        const ac = computeHungarianAccountCheck(acc, false);
        bban = bankBranch7 + bbCheck + acc + ac;
        accountNumber = acc;
      }
      break;
    }
    case "mod9710": {
      const without = layout.bbanLength - 2;
      let body: string;
      if (branchCode) {
        body = bankCode + branchCode + randomString(without - bankCode.length - branchCode.length, "digit");
      } else {
        body = bankCode + randomString(without - bankCode.length, layout.accountCharset);
      }
      bban = appendMod9710BbanCheck(body);
      accountNumber = bban.substring(layout.accountStart, layout.accountStart + layout.accountLength);
      break;
    }
    case "none":
    default: {
      if (layout.bankLength === 0) {
        bban = randomDigits(layout.bbanLength);
        accountNumber = bban;
        break;
      }
      const account = randomString(layout.accountLength, layout.accountCharset);
      const segments: { start: number; value: string }[] = [{ start: layout.bankStart, value: bankCode }];
      if (branchCode !== undefined && layout.branchStart !== undefined) {
        segments.push({ start: layout.branchStart, value: branchCode });
      }
      segments.push({ start: layout.accountStart, value: account });
      if (layout.prefixUpper) {
        segments.push({ start: 0, value: randomString(1, "upper") });
      }
      bban = placeSegments(layout, segments);
      accountNumber = bban.substring(layout.accountStart, layout.accountStart + layout.accountLength);
      break;
    }
  }

  if (!layout.bbanRegexp.test(bban)) {
    throw new Error(`Generated BBAN does not match country format`);
  }

  const extractedBank =
    layout.bankLength === 0 ? "" : bban.substring(layout.bankStart, layout.bankStart + layout.bankLength);
  const extractedBranch =
    layout.branchStart !== undefined && layout.branchLength
      ? bban.substring(layout.branchStart, layout.branchStart + layout.branchLength)
      : undefined;

  return {
    bban,
    bankCode: extractedBank,
    branchCode: extractedBranch,
    accountNumber,
  };
}

/** Positions in the BBAN that must be digits for this country's layout (for structure corruption / parsing). */
function charsetPositions(layout: BbanLayout, charset: Charset): number[] {
  const positions: number[] = [];
  const addRange = (start: number, length: number, fieldCharset: Charset) => {
    if (fieldCharset === charset) {
      for (let i = start; i < start + length; i++) {
        positions.push(i);
      }
    }
  };
  addRange(layout.bankStart, layout.bankLength, layout.bankCharset);
  if (layout.branchStart !== undefined && layout.branchLength && layout.branchCharset) {
    addRange(layout.branchStart, layout.branchLength, layout.branchCharset);
  }
  addRange(layout.accountStart, layout.accountLength, layout.accountCharset);
  if (layout.prefixUpper) {
    positions.push(0);
  }
  return positions;
}

export function digitRequiredPositions(layout: BbanLayout): number[] {
  return charsetPositions(layout, "digit");
}

export function upperRequiredPositions(layout: BbanLayout): number[] {
  return charsetPositions(layout, "upper");
}

export function accountNumberFromBban(countryCode: string, bban: string): string {
  const layout = BBAN_LAYOUTS[countryCode];
  if (!layout) {
    throw new Error(`Unsupported country: ${countryCode}`);
  }
  switch (layout.nationalCheck) {
    case "italy":
      return bban.substring(11, 23);
    case "finland":
      return bban.substring(3, 14);
    case "netherlands":
      return bban.substring(4, 14);
    case "norway":
      return bban.substring(4, 11);
    case "poland":
      return bban.substring(8, 24);
    case "spain":
      return bban.substring(10, 20);
    case "france":
      return bban.substring(10, 21);
    case "croatia":
      return bban.substring(7, 16);
    case "czech":
      return bban.substring(10, 19);
    case "estonia":
      return bban.substring(2, 16);
    case "hungary":
      if (bban.endsWith("00000000")) {
        return bban.substring(8, 15);
      }
      return bban.substring(8, 23);
    default:
      return bban.substring(layout.accountStart, layout.accountStart + layout.accountLength);
  }
}

function layout(
  bbanLength: number,
  bankStart: number,
  bankLength: number,
  bankCharset: Charset,
  branchStart: number | undefined,
  branchLength: number | undefined,
  branchCharset: Charset | undefined,
  accountStart: number,
  accountLength: number,
  accountCharset: Charset,
  nationalCheck: NationalCheck,
  bbanRegexp: RegExp,
  prefixUpper?: boolean,
): BbanLayout {
  return {
    bbanLength,
    bankStart,
    bankLength,
    bankCharset,
    branchStart,
    branchLength,
    branchCharset,
    accountStart,
    accountLength,
    accountCharset,
    nationalCheck,
    bbanRegexp,
    prefixUpper,
  };
}

export const BBAN_LAYOUTS: Record<string, BbanLayout> = {
  AD: layout(20, 0, 4, "digit", 4, 4, "digit", 8, 12, "alnum", "none", /^[0-9]{8}[A-Z0-9]{12}$/),
  AT: layout(16, 0, 5, "digit", undefined, undefined, undefined, 5, 11, "digit", "none", /^[0-9]{16}$/),
  BE: layout(12, 0, 3, "digit", undefined, undefined, undefined, 0, 12, "digit", "belgian", /^[0-9]{12}$/),
  BG: layout(18, 0, 4, "upper", 4, 6, "digit", 10, 8, "alnum", "none", /^[A-Z]{4}[0-9]{6}[A-Z0-9]{8}$/),
  CH: layout(17, 0, 5, "digit", undefined, undefined, undefined, 5, 12, "alnum", "none", /^[0-9]{5}[A-Z0-9]{12}$/),
  CY: layout(24, 0, 3, "digit", 3, 5, "digit", 8, 16, "alnum", "none", /^[0-9]{8}[A-Z0-9]{16}$/),
  CZ: layout(20, 0, 4, "digit", undefined, undefined, undefined, 10, 10, "digit", "czech", /^[0-9]{20}$/),
  DE: layout(18, 0, 8, "digit", undefined, undefined, undefined, 8, 10, "digit", "none", /^[0-9]{18}$/),
  DK: layout(14, 0, 4, "digit", undefined, undefined, undefined, 4, 10, "digit", "none", /^[0-9]{14}$/),
  EE: layout(16, 0, 2, "digit", undefined, undefined, undefined, 2, 14, "digit", "estonia", /^[0-9]{16}$/),
  ES: layout(20, 0, 4, "digit", 4, 4, "digit", 10, 10, "digit", "spain", /^[0-9]{20}$/),
  FI: layout(14, 0, 3, "digit", undefined, undefined, undefined, 3, 11, "digit", "finland", /^[0-9]{14}$/),
  FR: layout(23, 0, 5, "digit", 5, 5, "digit", 10, 11, "alnum", "france", /^[0-9]{10}[A-Z0-9]{11}[0-9]{2}$/),
  GB: layout(18, 0, 4, "upper", 4, 6, "digit", 10, 8, "digit", "none", /^[A-Z]{4}[0-9]{14}$/),
  GI: layout(19, 0, 4, "upper", undefined, undefined, undefined, 4, 15, "alnum", "none", /^[A-Z]{4}[A-Z0-9]{15}$/),
  GR: layout(23, 0, 3, "digit", 3, 4, "digit", 7, 16, "alnum", "none", /^[0-9]{7}[A-Z0-9]{16}$/),
  HR: layout(17, 0, 6, "digit", undefined, undefined, undefined, 8, 9, "digit", "croatia", /^[0-9]{17}$/),
  HU: layout(24, 0, 3, "digit", 3, 4, "digit", 8, 16, "digit", "hungary", /^[0-9]{24}$/),
  IE: layout(18, 0, 4, "alnum", 4, 6, "digit", 10, 8, "digit", "none", /^[A-Z0-9]{4}[0-9]{14}$/),
  IS: layout(22, 0, 2, "digit", 2, 2, "digit", 4, 18, "digit", "none", /^[0-9]{22}$/),
  IT: layout(23, 1, 5, "digit", 6, 5, "digit", 11, 12, "alnum", "italy", /^[A-Z]{1}[0-9]{10}[A-Z0-9]{12}$/),
  LI: layout(17, 0, 5, "digit", undefined, undefined, undefined, 5, 12, "alnum", "none", /^[0-9]{5}[A-Z0-9]{12}$/),
  LT: layout(16, 0, 5, "digit", undefined, undefined, undefined, 5, 11, "digit", "none", /^[0-9]{16}$/),
  LU: layout(16, 0, 3, "digit", undefined, undefined, undefined, 3, 13, "alnum", "none", /^[0-9]{3}[A-Z0-9]{13}$/),
  LV: layout(17, 0, 4, "upper", undefined, undefined, undefined, 4, 13, "alnum", "none", /^[A-Z]{4}[A-Z0-9]{13}$/),
  MC: layout(23, 0, 5, "digit", 5, 5, "digit", 10, 11, "alnum", "france", /^[0-9]{10}[A-Z0-9]{11}[0-9]{2}$/),
  MT: layout(27, 0, 4, "upper", 4, 5, "digit", 9, 18, "alnum", "none", /^[A-Z]{4}[0-9]{5}[A-Z0-9]{18}$/),
  NL: layout(14, 0, 4, "upper", undefined, undefined, undefined, 4, 10, "digit", "netherlands", /^[A-Z]{4}[0-9]{10}$/),
  NO: layout(11, 0, 4, "digit", undefined, undefined, undefined, 4, 7, "digit", "norway", /^[0-9]{11}$/),
  PL: layout(24, 0, 8, "digit", undefined, undefined, undefined, 8, 16, "digit", "poland", /^[0-9]{24}$/),
  PT: layout(21, 0, 4, "digit", undefined, undefined, undefined, 4, 17, "digit", "mod9710", /^[0-9]{21}$/),
  RO: layout(20, 0, 4, "upper", undefined, undefined, undefined, 4, 16, "alnum", "none", /^[A-Z]{4}[A-Z0-9]{16}$/),
  SE: layout(20, 0, 3, "digit", undefined, undefined, undefined, 3, 17, "digit", "none", /^[0-9]{20}$/),
  SI: layout(15, 0, 2, "digit", 2, 3, "digit", 5, 10, "digit", "mod9710", /^[0-9]{15}$/),
  SK: layout(20, 0, 4, "digit", undefined, undefined, undefined, 10, 10, "digit", "czech", /^[0-9]{20}$/),
  SM: layout(23, 1, 5, "digit", 6, 5, "digit", 11, 12, "alnum", "italy", /^[A-Z]{1}[0-9]{10}[A-Z0-9]{12}$/),
  VA: layout(18, 0, 0, "digit", undefined, undefined, undefined, 0, 18, "digit", "none", /^[0-9]{18}$/),
};
