/**
 * Validate if string is a valid blockchain address
 * @param address - Address to validate
 * @returns True if valid address format
 */
export function isValidAddress(address: string): boolean {
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

/**
 * Validate if string is not empty and has minimum length
 * @param value - String to validate
 * @param minLength - Minimum required length
 * @returns True if valid
 */
export function isValidString(value: string | null | undefined, minLength = 1): boolean {
  return Boolean(value && value.trim().length >= minLength);
}

/**
 * Validate API key format (basic check)
 * @param apiKey - API key to validate
 * @returns True if looks like valid API key
 */
export function isValidApiKey(apiKey: string): boolean {
  // Basic validation - should be at least 20 characters alphanumeric
  return /^[a-zA-Z0-9]{20,}$/.test(apiKey);
}

/**
 * Validate contract symbol (typically 2-6 uppercase letters)
 * @param symbol - Contract symbol
 * @returns True if valid symbol format
 */
export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]{2,6}$/.test(symbol);
}

/**
 * Validate contract name
 * @param name - Contract name
 * @returns True if valid name
 */
export function isValidContractName(name: string): boolean {
  return isValidString(name, 2) && name.length <= 50;
}
