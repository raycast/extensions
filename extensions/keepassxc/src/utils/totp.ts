import OTPAuth = require("otpauth");

/**
 * Generates a TOTP code given the TOTP URL.
 * @param {string} totpUrl - The TOTP URL.
 * @returns {string} The generated TOTP code.
 */
function getTOTPCode(totpUrl: string) {
  const totp = OTPAuth.URI.parse(totpUrl);
  const code = totp.generate();
  return code;
}

export { getTOTPCode };
