/**
 * Validates an IMEI (International Mobile Equipment Identity)
 * IMEI format: 15 digits, with Luhn check digit
 */
export function validateIMEI(imei: string): boolean {
  // Remove spaces and dashes
  const cleaned = imei.replace(/[\s-]/g, "");

  // Must be exactly 15 digits
  if (!/^\d{15}$/.test(cleaned)) {
    return false;
  }

  // Validate Luhn algorithm
  // For IMEI: double every second digit starting from the right
  // This means doubling digits at odd indices (0-indexed) when counting from the left
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i % 2 === 1) {
      // Odd indices (1, 3, 5, 7, 9, 11, 13) get doubled
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[14], 10);
}

/**
 * Validates an IBAN (International Bank Account Number)
 * IBAN format: 2-letter country code + 2 check digits + up to 30 alphanumeric characters
 */
export function validateIBAN(iban: string): boolean {
  // Remove spaces
  const cleaned = iban.replace(/\s/g, "").toUpperCase();

  // Basic format check: 15-34 characters, starts with 2 letters, then 2 digits, then alphanumeric
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return false;
  }

  // MOD-97-10 validation
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let numeric = "";
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      // A-Z -> 10-35
      numeric += (code - 55).toString();
    } else {
      numeric += char;
    }
  }

  // Calculate mod 97
  let remainder = "";
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder + numeric.slice(i, i + 7);
    remainder = (parseInt(chunk, 10) % 97).toString();
  }

  return parseInt(remainder, 10) === 1;
}

/**
 * Validates an ICCID (Integrated Circuit Card Identifier)
 * ICCID format: 19-20 digits, typically starts with 89 (for SIM cards)
 */
export function validateICCID(iccid: string): boolean {
  // Remove spaces
  const cleaned = iccid.replace(/\s/g, "");

  // Must be 19-20 digits
  if (!/^\d{19,20}$/.test(cleaned)) {
    return false;
  }

  // Typically starts with 89 for SIM cards, but not strictly required
  return true;
}

/**
 * Validates a UUID (Universally Unique Identifier)
 * UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12 hexadecimal digits)
 */
export function validateUUID(uuid: string): boolean {
  // Standard UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates an IP address (IPv4)
 * IP format: xxx.xxx.xxx.xxx where each xxx is 0-255
 */
export function validateIP(ip: string): boolean {
  // IPv4 regex pattern
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}
