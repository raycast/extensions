/**
 * Hints keyed by Namecheap error number.
 *
 * Built from observed wire responses, not from Namecheap's published error table, which is wrong for
 * several of these codes. Notably 1011102 is documented as "Parameter APIKey is missing" but is returned
 * as "API Key is invalid or API access has not been enabled".
 */
export const ERROR_HINTS: Record<string, string> = {
  // The whitelist is enforced on the address the request actually comes from. The Client IP
  // preference cannot change that, so it must never be offered as the remedy here.
  "1011150": "Add that address to Whitelisted IPs under Profile › Tools › Namecheap API Access.",
  "1017150": "Add that address to Whitelisted IPs under Profile › Tools › Namecheap API Access.",
  // Returned before the whitelist is consulted, so reaching it means the IP was never the problem.
  "1011102": "Re-copy the API Key, and confirm API access is switched on for this account.",
  "1010102": "Add your API Key in the extension preferences.",
  // These really are about the ClientIp parameter the extension sends.
  "1010105": "Set Client IP in the extension preferences, or leave it blank to detect it automatically.",
  "1011105": "Client IP must be a plain IPv4 address such as 203.0.113.10, or blank to detect it.",
  "1016103": "Check the Username in the extension preferences.",
  "1019103": "Check the Username in the extension preferences.",
  "1011101": "Check the API User in the extension preferences.",
  "1010101": "Add your API User in the extension preferences.",
};

/** Errors that mean "the address this request came from is not whitelisted". */
export const WHITELIST_ERROR_NUMBERS = new Set(["1011150", "1017150"]);

/**
 * Errors that mean a configured value is wrong rather than the network being unhappy. Retrying these
 * changes nothing; the user has to edit a preference.
 */
export const PREFERENCE_ERROR_NUMBERS = new Set([
  "1010101", // API User missing
  "1011101", // API User invalid
  "1010102", // API Key missing
  "1011102", // API Key invalid, or API access not enabled
  "1010105", // ClientIp missing
  "1011105", // ClientIp invalid
  "1016103", // Username not found
  "1019103", // Username invalid
]);
