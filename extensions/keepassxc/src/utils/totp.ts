import { URI } from "otpauth";

/**
 * Generates a TOTP code given the TOTP URL.
 * @param {string} totpUrl - The TOTP URL.
 * @returns {string} The generated TOTP code.
 */
function getTOTPCode(totpUrl: string) {
  const totp = URI.parse(totpUrl);
  const code = totp.generate();
  return code;
}

export { getTOTPCode };
