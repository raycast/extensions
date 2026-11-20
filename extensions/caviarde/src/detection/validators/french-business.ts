import { isLuhnValid } from "./luhn";

/** La Poste SIRETs fail Luhn by design; INSEE specifies a digit-sum rule instead. */
const LA_POSTE_SIREN = "356000000";

export function isSirenValid(digits: string): boolean {
  return /^\d{9}$/.test(digits) && isLuhnValid(digits);
}

export function isSiretValid(digits: string): boolean {
  if (!/^\d{14}$/.test(digits)) return false;

  if (digits.startsWith(LA_POSTE_SIREN)) {
    let sum = 0;
    for (const digit of digits) sum += digit.charCodeAt(0) - 48;
    return sum % 5 === 0;
  }

  return isLuhnValid(digits);
}
