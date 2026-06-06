/**
 * VAT number body generators.
 *
 * Each function returns the part of the VAT number that comes *after* the
 * country prefix (e.g. for "NL123456789B01" it returns "123456789B01").
 *
 * Two kinds of generators live here:
 *  - `formatBody`: builds a string from a small pattern language. The result
 *    matches the country's length/character pattern but checksums are NOT
 *    guaranteed.
 *  - The named functions (nl, de, be, ...): build numbers whose check
 *    digit(s) satisfy the country's documented algorithm.
 */

import { pick, randInt, randomDigit, randomDigitNonZero, toDigitArray, pad } from "./random";

/**
 * Pattern language:
 *   9 -> random digit (0-9)
 *   A -> random uppercase letter (A-Z)
 *   X -> random alphanumeric (0-9 or A-Z)
 *   any other character -> kept literally
 */
export function formatBody(pattern: string): string {
  let out = "";
  for (const ch of pattern) {
    switch (ch) {
      case "9":
        out += randomDigit();
        break;
      case "A":
        out += String.fromCharCode(65 + randInt(0, 25));
        break;
      case "X": {
        const n = randInt(0, 35);
        out += n < 10 ? String(n) : String.fromCharCode(65 + (n - 10));
        break;
      }
      default:
        out += ch;
    }
  }
  return out;
}

/** Luhn (mod 10) check digit for a numeric string. */
function luhnCheckDigit(digits: string): number {
  const arr = toDigitArray(digits);
  let sum = 0;
  // The check digit will be appended, so the rightmost existing digit is at
  // an "even" position from the right and must be doubled.
  let double = true;
  for (let i = arr.length - 1; i >= 0; i--) {
    let d = arr[i];
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/** Weighted sum of digits given matching weights. */
function weightedSum(digits: number[], weights: number[]): number {
  return digits.reduce((acc, d, i) => acc + d * weights[i], 0);
}

// --- Netherlands: 9 digits (11-proef) + "B" + 2-digit sub-number ----------
export function nl(): string {
  // weights 9..2 for first 8 digits, 9th is the check (weight -1 / mod 11).
  for (let attempt = 0; attempt < 50; attempt++) {
    const first8 = `${randomDigitNonZero()}${randDigitsRaw(7)}`;
    const sum = weightedSum(toDigitArray(first8), [9, 8, 7, 6, 5, 4, 3, 2]);
    const check = sum % 11;
    if (check === 10) continue; // not a valid single check digit
    const sub = pad(randInt(1, 99), 2);
    return `${first8}${check}B${sub}`;
  }
  return `123456782B01`;
}

// --- Germany: 9 digits, ISO 7064 MOD 11,10 --------------------------------
export function de(): string {
  const first8 = `${randomDigitNonZero()}${randDigitsRaw(7)}`;
  const arr = toDigitArray(first8);
  let product = 10;
  for (const d of arr) {
    let sum = (d + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  const check = (11 - product) % 10;
  return `${first8}${check}`;
}

// --- Belgium: 10 digits, last 2 = 97 - (first 8 mod 97) -------------------
export function be(): string {
  const lead = randInt(0, 1); // current scheme allows 0 or 1
  const first8 = `${lead}${randDigitsRaw(7)}`;
  const check = 97 - (Number(first8) % 97);
  return `${first8}${pad(check, 2)}`;
}

// --- France: 2-digit key + 9-digit SIREN (Luhn) ---------------------------
export function fr(): string {
  const siren8 = randDigitsRaw(8);
  const sirenCheck = luhnCheckDigit(siren8);
  const siren = `${siren8}${sirenCheck}`;
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `${pad(key, 2)}${siren}`;
}

// --- Italy: 11 digits, alternating 1/2 weights + office code --------------
export function it(): string {
  const mult = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  const core7 = `${randomDigitNonZero()}${randDigitsRaw(6)}`;
  const office = pad(randInt(1, 201), 3);
  const first10 = `${core7}${office}`;
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const temp = Number(first10[i]) * mult[i];
    if (temp > 9) total += Math.floor(temp / 10) + (temp % 10);
    else total += temp;
  }
  let check = 10 - (total % 10);
  if (check > 9) check = 0;
  return `${first10}${check}`;
}

// --- Spain: CIF for "A" organisations (numeric control digit) -------------
export function es(): string {
  const body = randDigitsRaw(7);
  const arr = toDigitArray(body);
  let sum = 0;
  arr.forEach((d, i) => {
    // 1-indexed: odd positions doubled, even positions added as-is.
    if ((i + 1) % 2 === 1) {
      const doubled = d * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += d;
    }
  });
  const control = (10 - (sum % 10)) % 10;
  return `A${body}${control}`;
}

// --- Luxembourg: 8 digits, first 6 mod 89 = last 2 ------------------------
export function lu(): string {
  const first6 = `${randomDigitNonZero()}${randDigitsRaw(5)}`;
  const check = Number(first6) % 89;
  return `${first6}${pad(check, 2)}`;
}

// --- Poland: 10 digits, weighted mod 11 -----------------------------------
export function pl(): string {
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  for (let attempt = 0; attempt < 50; attempt++) {
    const first9 = randDigitsRaw(9);
    const check = weightedSum(toDigitArray(first9), weights) % 11;
    if (check === 10) continue;
    return `${first9}${check}`;
  }
  return `1234563218`;
}

// --- Sweden: 10-digit org number (Luhn) + "01" ----------------------------
export function se(): string {
  const first9 = randDigitsRaw(9);
  const org = `${first9}${luhnCheckDigit(first9)}`;
  return `${org}01`;
}

// --- Finland: 8 digits, weighted mod 11 -----------------------------------
export function fi(): string {
  const weights = [7, 9, 10, 5, 8, 4, 2];
  for (let attempt = 0; attempt < 50; attempt++) {
    const first7 = randDigitsRaw(7);
    const remainder = weightedSum(toDigitArray(first7), weights) % 11;
    if (remainder === 1) continue; // invalid
    const check = remainder === 0 ? 0 : 11 - remainder;
    return `${first7}${check}`;
  }
  return `01234564`;
}

// --- Denmark: 8 digits, weighted mod 11 (sum incl. check ≡ 0) -------------
export function dk(): string {
  const weights = [2, 7, 6, 5, 4, 3, 2];
  for (let attempt = 0; attempt < 50; attempt++) {
    const first7 = `${randomDigitNonZero()}${randDigitsRaw(6)}`;
    const sum = weightedSum(toDigitArray(first7), weights);
    const remainder = sum % 11;
    const check = remainder === 0 ? 0 : 11 - remainder;
    if (check === 10) continue; // invalid
    return `${first7}${check}`;
  }
  return `12345674`;
}

// --- Portugal: 9 digits, weighted mod 11 ----------------------------------
export function pt(): string {
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  const first8 = `${randomDigitNonZero()}${randDigitsRaw(7)}`;
  const remainder = weightedSum(toDigitArray(first8), weights) % 11;
  const check = remainder < 2 ? 0 : 11 - remainder;
  return `${first8}${check}`;
}

// --- Austria: U + 8 digits (Luhn-style + offset) --------------------------
export function at(): string {
  const mult = [1, 2, 1, 2, 1, 2, 1];
  const first7 = randDigitsRaw(7);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const temp = Number(first7[i]) * mult[i];
    if (temp > 9) total += Math.floor(temp / 10) + (temp % 10);
    else total += temp;
  }
  let check = 10 - ((total + 4) % 10);
  if (check === 10) check = 0;
  return `U${first7}${check}`;
}

// --- Bulgaria: 9-digit legal entity ---------------------------------------
export function bg(): string {
  const first8 = randDigitsRaw(8);
  let temp = 0;
  for (let i = 0; i < 8; i++) temp += Number(first8[i]) * (i + 1);
  let check = temp % 11;
  if (check !== 10) return `${first8}${check}`;
  temp = 0;
  for (let i = 0; i < 8; i++) temp += Number(first8[i]) * (i + 3);
  check = temp % 11;
  if (check === 10) check = 0;
  return `${first8}${check}`;
}

// --- Croatia: 11 digits, ISO 7064 MOD 11-10 -------------------------------
export function hr(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const first10 = randDigitsRaw(10);
    const check = hrCheckDigit(first10);
    if (check >= 0) return `${first10}${check}`;
  }
  return "12345678903";
}

// --- Cyprus: 8 digits + check letter --------------------------------------
export function cy(): string {
  let digits = randDigitsRaw(8);
  if (digits.startsWith("12")) digits = `10${digits.slice(2)}`;
  return `${digits}${cyCheckChar(digits)}`;
}

// --- Czechia: 8-digit legal entity ----------------------------------------
export function cz(): string {
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const first7 = randDigitsRaw(7);
  const total = weightedSum(toDigitArray(first7), weights);
  let check = 11 - (total % 11);
  if (check === 10) check = 0;
  if (check === 11) check = 1;
  return `${first7}${check}`;
}

// --- Estonia: 10 + 7 digits (KMKR format) ---------------------------------
export function ee(): string {
  const weights = [3, 7, 1, 3, 7, 1, 3, 7];
  const first8 = `10${randDigitsRaw(6)}`;
  const total = weightedSum(toDigitArray(first8), weights);
  let check = 10 - (total % 10);
  if (check === 10) check = 0;
  return `${first8}${check}`;
}

// --- Greece: 9 digits (EL prefix applied in countries.ts) -----------------
export function gr(): string {
  const weights = [256, 128, 64, 32, 16, 8, 4, 2];
  const first8 = randDigitsRaw(8);
  const total = weightedSum(toDigitArray(first8), weights) % 11;
  const check = total > 9 ? 0 : total;
  return `${first8}${check}`;
}

// --- Hungary: 8 digits ----------------------------------------------------
export function hu(): string {
  const weights = [9, 7, 3, 1, 9, 7, 3];
  const first7 = randDigitsRaw(7);
  let check = 10 - (weightedSum(toDigitArray(first7), weights) % 10);
  if (check === 10) check = 0;
  return `${first7}${check}`;
}

// --- Ireland: 7 digits + check letter (new style) -------------------------
export function ie(): string {
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const first7 = randDigitsRaw(7);
  const total = weightedSum(toDigitArray(first7), weights) % 23;
  const letter = total === 0 ? "W" : String.fromCharCode(total + 64);
  return `${first7}${letter}`;
}

// --- Latvia: 11-digit legal entity ----------------------------------------
export function lv(): string {
  const weights = [9, 1, 4, 8, 3, 10, 2, 5, 7, 6];
  const lead = String(randInt(4, 9));
  const first10 = `${lead}${randDigitsRaw(9)}`;
  let total = weightedSum(toDigitArray(first10), weights);
  if (total % 11 === 4 && first10[0] === "9") total -= 45;
  const mod = total % 11;
  const check = mod === 4 ? 4 - mod : mod > 4 ? 14 - mod : 3 - mod;
  return `${first10}${check}`;
}

// --- Lithuania: 9-digit legal person --------------------------------------
export function lt(): string {
  const short = [3, 4, 5, 6, 7, 8, 9, 1];
  const first7 = randDigitsRaw(7);
  const first8 = `${first7}1`;
  let total = 0;
  for (let i = 0; i < 8; i++) total += Number(first8[i]) * (i + 1);
  if (total % 11 === 10) total = weightedSum(toDigitArray(first8), short);
  let check = total % 11;
  if (check === 10) check = 0;
  return `${first8}${check}`;
}

// --- Malta: 8 digits, MOD 37 ----------------------------------------------
export function mt(): string {
  const weights = [3, 4, 6, 7, 8, 9];
  const first6 = `${randomDigitNonZero()}${randDigitsRaw(5)}`;
  const check = 37 - (weightedSum(toDigitArray(first6), weights) % 37);
  return `${first6}${pad(check, 2)}`;
}

// --- Romania: 10-digit CIF ------------------------------------------------
export function ro(): string {
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const first9 = `${randomDigitNonZero()}${randDigitsRaw(8)}`;
  const total = weightedSum(toDigitArray(first9), weights);
  let check = (10 * total) % 11;
  if (check === 10) check = 0;
  return `${first9}${check}`;
}

// --- Slovakia: 10 digits divisible by 11 ----------------------------------
export function sk(): string {
  const thirdDigits = [2, 3, 4, 6, 7, 8, 9];
  for (let attempt = 0; attempt < 100; attempt++) {
    const first9 = `${randomDigitNonZero()}${randomDigit()}${pick(thirdDigits)}${randDigitsRaw(6)}`;
    for (let last = 0; last <= 9; last++) {
      if (Number(`${first9}${last}`) % 11 === 0) return `${first9}${last}`;
    }
  }
  return "2022749619";
}

// --- Slovenia: 8 digits, MOD 11 -------------------------------------------
export function si(): string {
  const weights = [8, 7, 6, 5, 4, 3, 2];
  for (let attempt = 0; attempt < 50; attempt++) {
    const first7 = `${randomDigitNonZero()}${randDigitsRaw(6)}`;
    let check = 11 - (weightedSum(toDigitArray(first7), weights) % 11);
    if (check === 10) check = 0;
    if (check !== 11) return `${first7}${check}`;
  }
  return "12345678";
}

// --- United Kingdom: 9-digit standard VAT ---------------------------------
export function gb(): string {
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const core = pad(randInt(1000001, 9999999), 7);
  const total = weightedSum(toDigitArray(core), weights);
  let check = total;
  while (check > 0) check -= 97;
  check = Math.abs(check);
  if (check >= 55) check -= 55;
  else check += 42;
  return `${core}${pad(check, 2)}`;
}

// --- Switzerland: CHE + 9 digits (body only) ------------------------------
export function ch(): string {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  for (let attempt = 0; attempt < 50; attempt++) {
    const first8 = randDigitsRaw(8);
    let check = 11 - (weightedSum(toDigitArray(first8), weights) % 11);
    if (check === 10) continue;
    if (check === 11) check = 0;
    return `${first8}${check}`;
  }
  return "123456785";
}

// --- Norway: 9 digits + MVA ------------------------------------------------
export function no(): string {
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  for (let attempt = 0; attempt < 50; attempt++) {
    const first8 = randDigitsRaw(8);
    let check = 11 - (weightedSum(toDigitArray(first8), weights) % 11);
    if (check === 11) check = 0;
    if (check < 10) return `${first8}${check}MVA`;
  }
  return "123456785MVA";
}

// --- United States: 9-digit EIN (valid IRS prefix, no checksum) -----------
/** @see https://www.irs.gov/businesses/small-businesses-self-employed/valid-eins */
export const VALID_EIN_PREFIXES = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "50",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "57",
  "58",
  "59",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "71",
  "72",
  "73",
  "74",
  "75",
  "76",
  "77",
  "80",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "90",
  "91",
  "92",
  "93",
  "94",
  "95",
  "98",
  "99",
] as const;

export function us(): string {
  const prefix = pick(VALID_EIN_PREFIXES);
  return `${prefix}-${randDigitsRaw(7)}`;
}

// --- Andorra: letter + 6 digits + letter ----------------------------------
const ANDORRA_LETTERS = "FEALECDGOPU";

export function ad(): string {
  const letter = () => pick(ANDORRA_LETTERS.split(""));
  return `${letter()}${randDigitsRaw(6)}${letter()}`;
}

// --- Serbia: 9 digits, ISO 7064 MOD 11-10 ---------------------------------
export function rs(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const first8 = randDigitsRaw(8);
    const check = rsCheckDigit(first8);
    if (check >= 0) return `${first8}${check}`;
  }
  return "100000017";
}

function rsCheckDigit(first8: string): number {
  let product = 10;
  for (let i = 0; i < 8; i++) {
    let sum = (Number(first8[i]) + product) % 10;
    if (sum === 0) sum = 10;
    product = (2 * sum) % 11;
  }
  for (let check = 0; check <= 9; check++) {
    if ((product + check) % 10 === 1) return check;
  }
  return -1;
}

function hrCheckDigit(first10: string): number {
  let product = 10;
  for (let i = 0; i < 10; i++) {
    let sum = (Number(first10[i]) + product) % 10;
    if (sum === 0) sum = 10;
    product = (2 * sum) % 11;
  }
  for (let check = 0; check <= 9; check++) {
    if ((product + check) % 10 === 1) return check;
  }
  return -1;
}

function cyCheckChar(digits8: string): string {
  let total = 0;
  for (let i = 0; i < 8; i++) {
    let temp = Number(digits8[i]);
    if (i % 2 === 0) {
      switch (temp) {
        case 0:
          temp = 1;
          break;
        case 1:
          temp = 0;
          break;
        case 2:
          temp = 5;
          break;
        case 3:
          temp = 7;
          break;
        case 4:
          temp = 9;
          break;
        default:
          temp = temp * 2 + 3;
      }
    }
    total += temp;
  }
  return String.fromCharCode((total % 26) + 65);
}

/** Internal: raw run of random digits (no leading-zero rules). */
function randDigitsRaw(count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += randomDigit();
  return out;
}
