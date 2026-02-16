/**
 * Validates if a string is a valid ICAO airport code
 * ICAO codes are exactly 4 characters long and contain only letters
 */
export function isValidIcaoCode(code: string): boolean {
  return /^[A-Za-z]{4}$/.test(code);
}
