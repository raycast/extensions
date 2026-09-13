import { isLuhnValid } from "./luhn";

/** Luhn is one check digit, so about one arbitrary number in ten satisfies it.
 * On its own it masks epoch timestamps and order numbers, which the extension
 * promises to leave intact, so a card also has to start like one. */
const ISSUER_RANGES: readonly (readonly [number, number, number])[] = [
  // [prefix length, first, last]
  [1, 4, 4], // Visa
  [2, 34, 34], // American Express
  [2, 37, 37], // American Express
  [2, 36, 36], // Diners Club
  [2, 38, 39], // Diners Club
  [2, 51, 55], // Mastercard
  [2, 62, 62], // UnionPay
  [2, 65, 65], // Discover
  [3, 300, 305], // Diners Club
  [3, 644, 649], // Discover
  [4, 2221, 2720], // Mastercard, the 2-series
  [4, 3528, 3589], // JCB
  [4, 6011, 6011], // Discover
];

function hasIssuerPrefix(digits: string): boolean {
  return ISSUER_RANGES.some(
    ([length, first, last]) =>
      digits.length > length &&
      Number(digits.slice(0, length)) >= first &&
      Number(digits.slice(0, length)) <= last,
  );
}

export function isCardNumber(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  return hasIssuerPrefix(digits) && isLuhnValid(digits);
}
