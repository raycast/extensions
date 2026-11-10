/** ISO 7064 mod-97-10 on a numeric string (already expanded A=10 etc. if needed). */
export function mod9710(validationString: string): number {
  let s = validationString;
  while (s.length > 2) {
    const part = s.slice(0, 6);
    const partInt = parseInt(part, 10);
    if (Number.isNaN(partInt)) {
      return NaN;
    }
    s = (partInt % 97) + s.slice(part.length);
  }
  return parseInt(s, 10) % 97;
}

export function expandIbanChars(str: string): string {
  return str
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 65 ? (code - 55).toString() : c;
    })
    .join("");
}

/** Compute two IBAN check digits for a given country code and BBAN. */
export function computeIbanCheckDigits(countryCode: string, bban: string): string {
  const validationString = expandIbanChars(`${bban}${countryCode}00`);
  const remainder = mod9710(validationString);
  const check = 98 - remainder;
  return check.toString().padStart(2, "0");
}

/** Append mod-97-10 BBAN national check digits so full BBAN yields mod9710 === 1. */
export function appendMod9710BbanCheck(partialWithoutCheck: string): string {
  const remainder = mod9710(partialWithoutCheck + "00");
  const check = 98 - remainder;
  return partialWithoutCheck + check.toString().padStart(2, "0");
}

export function mod1110Control(toCheck: string): number {
  let nr = 10;
  for (let i = 0; i < toCheck.length; i++) {
    nr += parseInt(toCheck.charAt(i), 10);
    if (nr % 10 !== 0) {
      nr = nr % 10;
    }
    nr = (nr * 2) % 11;
  }
  const ctrl = 11 - nr;
  return ctrl === 10 ? 0 : ctrl;
}

const NORWAY_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const POLAND_WEIGHTS = [3, 9, 7, 1, 3, 9, 7];
const ES_WEIGHTS_BANK = [4, 8, 5, 10, 9, 7, 3, 6];
const ES_WEIGHTS_ACCOUNT = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
const CZ_WEIGHTS_PREFIX = [10, 5, 8, 4, 2, 1];
const CZ_WEIGHTS_SUFFIX = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];
const EE_WEIGHTS = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
const HU_WEIGHTS = [9, 7, 3, 1, 9, 7, 3, 1, 9, 7, 3, 1, 9, 7, 3];

function esControlDigit(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights[i]!;
  }
  const remainder = sum % 11;
  return remainder === 0 ? 0 : remainder === 1 ? 1 : 11 - remainder;
}

function czControlDigit(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights[i]!;
  }
  const remainder = sum % 11;
  return remainder === 0 ? 0 : remainder === 1 ? 1 : 11 - remainder;
}

function weightedMod10Control(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights[i]!;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function normalizeFrenchChar(c: string): string {
  const code = c.charCodeAt(0);
  if (code < 65) {
    return c;
  }
  const map: Record<number, string> = {
    65: "1",
    74: "1",
    66: "2",
    75: "2",
    83: "2",
    67: "3",
    76: "3",
    84: "3",
    68: "4",
    77: "4",
    85: "4",
    69: "5",
    78: "5",
    86: "5",
    70: "6",
    79: "6",
    87: "6",
    71: "7",
    80: "7",
    88: "7",
    72: "8",
    81: "8",
    89: "8",
    73: "9",
    82: "9",
    90: "9",
  };
  return map[code] ?? c;
}

function normalizeFrenchBban(bban: string): string {
  return bban
    .split("")
    .map((ch) => normalizeFrenchChar(ch))
    .join("");
}

export function computeBelgianCheckDigits(checkingPart: string): string {
  const n = BigInt(checkingPart);
  const remainder = Number(n % 97n);
  const checksum = remainder === 0 ? 97 : remainder;
  return checksum.toString().padStart(2, "0");
}

export function computeNorwayControlDigit(first10: string): string {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(first10.charAt(i), 10) * NORWAY_WEIGHTS[i]!;
  }
  const remainder = sum % 11;
  const ctrl = remainder === 0 ? 0 : 11 - remainder;
  return String(ctrl);
}

export function computePolandBankBranchCheckDigit(bankBranch7: string): string {
  return String(weightedMod10Control(bankBranch7, POLAND_WEIGHTS));
}

export function computeSpanishCheckDigits(bankBranch8: string, account10: string): string {
  const c1 = esControlDigit(bankBranch8, ES_WEIGHTS_BANK);
  const c2 = esControlDigit(account10, ES_WEIGHTS_ACCOUNT);
  return `${c1}${c2}`;
}

export function computeCzechPrefixCheck(prefix5: string): string {
  return String(czControlDigit(prefix5, CZ_WEIGHTS_PREFIX));
}

export function computeCzechSuffixCheck(suffix10: string): string {
  return String(czControlDigit(suffix10, CZ_WEIGHTS_SUFFIX));
}

export function computeEstonianCheck(bbanWithoutCheck: string): string {
  const toCheck = bbanWithoutCheck.substring(2, 15);
  return String(weightedMod10Control(toCheck, EE_WEIGHTS));
}

export function computeHungarianBankBranchCheck(bankBranch7: string): string {
  return String(weightedMod10Control(bankBranch7, HU_WEIGHTS));
}

export function computeHungarianAccountCheck(accountPart: string, trailingZeros: boolean): string {
  const len = trailingZeros ? 7 : 15;
  const slice = accountPart.substring(0, len);
  return String(weightedMod10Control(slice, HU_WEIGHTS));
}

export function computeFrenchRibKey(body21: string): string {
  for (let key = 1; key <= 97; key++) {
    const keyStr = key.toString().padStart(2, "0");
    const candidate = body21 + keyStr;
    if (mod9710(normalizeFrenchBban(candidate)) === 0) {
      return keyStr;
    }
  }
  return "97";
}

export function isValidMod9710Bban(bban: string): boolean {
  return mod9710(bban) === 1;
}

export function isValidBelgianBban(bban: string): boolean {
  const checkingPart = bban.substring(0, bban.length - 2);
  const checksum = parseInt(bban.slice(-2), 10);
  const n = BigInt(checkingPart);
  const remainder = Number(n % 97n);
  const expected = remainder === 0 ? 97 : remainder;
  return checksum === expected;
}

export function isValidNorwayBban(bban: string): boolean {
  return computeNorwayControlDigit(bban.substring(0, 10)) === bban.charAt(10);
}

export function isValidPolandBban(bban: string): boolean {
  return computePolandBankBranchCheckDigit(bban.substring(0, 7)) === bban.charAt(7);
}

export function isValidSpainBban(bban: string): boolean {
  const expected = computeSpanishCheckDigits(bban.substring(0, 8), bban.substring(10, 20));
  return bban.charAt(8) === expected.charAt(0) && bban.charAt(9) === expected.charAt(1);
}

export function isValidFrenchBban(bban: string): boolean {
  return mod9710(normalizeFrenchBban(bban)) === 0;
}

export function isValidCroatianBban(bban: string): boolean {
  const cBank = mod1110Control(bban.substring(0, 6));
  const cAcc = mod1110Control(bban.substring(7, 16));
  return cBank === parseInt(bban.charAt(6), 10) && cAcc === parseInt(bban.charAt(16), 10);
}

export function isValidCzechSlovakBban(bban: string): boolean {
  const p = computeCzechPrefixCheck(bban.substring(4, 9));
  const s = computeCzechSuffixCheck(bban.substring(10, 19));
  return p === bban.charAt(9) && s === bban.charAt(19);
}

export function isValidEstonianBban(bban: string): boolean {
  return computeEstonianCheck(bban.slice(0, -1)) === bban.charAt(15);
}

export function isValidHungarianBban(bban: string): boolean {
  const bankBranch = bban.substring(0, 7);
  if (computeHungarianBankBranchCheck(bankBranch) !== bban.charAt(7)) {
    return false;
  }
  if (bban.endsWith("00000000")) {
    return computeHungarianAccountCheck(bban.substring(8, 15), true) === bban.charAt(15);
  }
  return computeHungarianAccountCheck(bban.substring(8, 23), false) === bban.charAt(23);
}

const ITALIAN_CIN_ODD: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

function italianCinValue(char: string, oneBasedPosition: number): number {
  const upper = char.toUpperCase();
  if (oneBasedPosition % 2 === 1) {
    return ITALIAN_CIN_ODD[upper] ?? NaN;
  }
  if (/^[0-9]$/.test(upper)) {
    return parseInt(upper, 10);
  }
  return upper.charCodeAt(0) - 65;
}

/** Compute Italian/San Marino CIN from 22-character ABI+CAB+account body. */
export function computeItalianCin(abiCabAccount22: string): string {
  let sum = 0;
  const body = abiCabAccount22.toUpperCase();
  for (let i = 0; i < body.length; i++) {
    const value = italianCinValue(body.charAt(i), i + 1);
    if (Number.isNaN(value)) {
      throw new Error("Invalid character in Italian BBAN body");
    }
    sum += value;
  }
  const remainder = sum % 26;
  return String.fromCharCode(65 + remainder);
}

export function isValidItalianCinBban(bban: string): boolean {
  if (bban.length < 23) {
    return false;
  }
  const expected = computeItalianCin(bban.substring(1, 23));
  return bban.charAt(0).toUpperCase() === expected;
}

export function isValidFinnishLuhnBban(bban: string): boolean {
  if (bban.length !== 14 || !/^[0-9]+$/.test(bban)) {
    return false;
  }
  return isValidLuhnDigitString(bban);
}

export function isValidLuhnDigitString(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) {
        d -= 9;
      }
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function computeFinnishLuhnCheckDigit(first13: string): string {
  for (let d = 0; d <= 9; d++) {
    if (isValidLuhnDigitString(first13 + String(d))) {
      return String(d);
    }
  }
  throw new Error("No valid Finnish Luhn check digit");
}

const NL_ELF_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export function isValidDutchElfproefAccount(account10: string): boolean {
  if (account10.length !== 10 || !/^[0-9]{10}$/.test(account10)) {
    return false;
  }
  if (/^0+$/.test(account10)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(account10.charAt(i), 10) * NL_ELF_WEIGHTS[i]!;
  }
  return sum % 11 === 0;
}

export function isValidDutchElfproefBban(bban: string): boolean {
  if (bban.length !== 14) {
    return false;
  }
  return isValidDutchElfproefAccount(bban.substring(4, 14));
}

export function appendDutchElfproefCheckDigit(first9: string): string {
  for (let d = 0; d <= 9; d++) {
    const account = first9 + String(d);
    if (isValidDutchElfproefAccount(account)) {
      return account;
    }
  }
  throw new Error("No valid elfproef check digit for partial account");
}
