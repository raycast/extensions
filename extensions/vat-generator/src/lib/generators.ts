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

import { randInt, randomDigit, randomDigitNonZero, toDigitArray, pad } from "./random";

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

// --- Italy: 11 digits, Luhn over first 10 ---------------------------------
export function it(): string {
  const first10 = randDigitsRaw(10);
  return `${first10}${luhnCheckDigit(first10)}`;
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

/** Internal: raw run of random digits (no leading-zero rules). */
function randDigitsRaw(count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += randomDigit();
  return out;
}
