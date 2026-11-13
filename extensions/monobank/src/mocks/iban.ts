/**
 * A Ukrainian IBAN with valid check digits: "UA", 2 check digits, the bank's 6-digit MFO and a 19-digit account
 * number (`account` is padded with zeros).
 */
export function createIban(mfo: string, account: string) {
  const bban = mfo + account.padStart(19, "0");
  // ISO 13616: the country code and "00" moved to the end, letters as numbers (U = 30, A = 10).
  const remainder = BigInt(`${bban}301000`) % 97n;
  const check = String(98n - remainder).padStart(2, "0");
  return `UA${check}${bban}`;
}
