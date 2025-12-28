/**
 * Generates a valid IMEI (International Mobile Equipment Identity)
 * IMEI format: 15 digits, with Luhn check digit
 */
export function generateIMEI(): string {
  // Generate 14 random digits
  const digits: number[] = [];
  for (let i = 0; i < 14; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  // Calculate Luhn check digit
  // For IMEI: double every second digit starting from the right
  // This means doubling digits at odd indices (0-indexed) when counting from the left
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = digits[i];
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
  digits.push(checkDigit);

  return digits.join("");
}

/**
 * Generates a valid ICCID (Integrated Circuit Card Identifier)
 * ICCID format: 19-20 digits, typically starts with 89 (for SIM cards)
 */
export function generateICCID(): string {
  // Start with 89 (typical for SIM cards)
  const prefix = "89";
  const digits: number[] = [];

  // Generate remaining 17-18 digits
  for (let i = 0; i < 18; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  return prefix + digits.join("");
}

/**
 * Generates a valid MSISDN (Mobile Station International Subscriber Directory Number)
 * MSISDN format: Country code + National Destination Code + Subscriber Number
 * Example: +1234567890
 */
export function generateMSISDN(): string {
  // Common country codes (1-3 digits)
  const countryCodes = ["1", "44", "33", "49", "81", "86", "91", "61"];
  const countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)];

  // Generate remaining digits (typically 7-10 digits)
  const remainingLength = 10 - countryCode.length;
  const digits: number[] = [];

  // First digit shouldn't be 0
  digits.push(Math.floor(Math.random() * 9) + 1);

  for (let i = 1; i < remainingLength; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  return `+${countryCode}${digits.join("")}`;
}

/**
 * Generates a UUID v4 (Universally Unique Identifier version 4)
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a valid MAC address
 * MAC format: XX:XX:XX:XX:XX:XX (hexadecimal)
 */
export function generateMACAddress(): string {
  const octets: string[] = [];
  for (let i = 0; i < 6; i++) {
    const octet = Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
    octets.push(octet);
  }
  return octets.join(":");
}

/**
 * Generates a valid random IP address (IPv4)
 * Generates random IPs in common private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
 */
export function generateIPAddress(): string {
  const ranges = [
    // 10.0.0.0/8 (10.0.0.0 to 10.255.255.255)
    () => {
      const octet1 = 10;
      const octet2 = Math.floor(Math.random() * 256);
      const octet3 = Math.floor(Math.random() * 256);
      const octet4 = Math.floor(Math.random() * 256);
      return `${octet1}.${octet2}.${octet3}.${octet4}`;
    },
    // 172.16.0.0/12 (172.16.0.0 to 172.31.255.255)
    () => {
      const octet1 = 172;
      const octet2 = Math.floor(Math.random() * 16) + 16; // 16-31
      const octet3 = Math.floor(Math.random() * 256);
      const octet4 = Math.floor(Math.random() * 256);
      return `${octet1}.${octet2}.${octet3}.${octet4}`;
    },
    // 192.168.0.0/16 (192.168.0.0 to 192.168.255.255)
    () => {
      const octet1 = 192;
      const octet2 = 168;
      const octet3 = Math.floor(Math.random() * 256);
      const octet4 = Math.floor(Math.random() * 256);
      return `${octet1}.${octet2}.${octet3}.${octet4}`;
    },
  ];

  const randomRange = ranges[Math.floor(Math.random() * ranges.length)];
  return randomRange();
}

/**
 * Generates a valid IBAN (International Bank Account Number)
 * IBAN format: 2-letter country code + 2 check digits + BBAN (Basic Bank Account Number)
 * Uses GB (UK) format: GB + 2 check digits + 4 letters + 6 digits + 8 digits = 22 characters
 */
export function generateIBAN(): string {
  // Use GB (UK) format - 22 characters total
  const countryCode = "GB";

  // Generate random BBAN: 4 letters + 6 digits + 8 digits
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let bban = "";

  // 4 random letters
  for (let i = 0; i < 4; i++) {
    bban += letters[Math.floor(Math.random() * letters.length)];
  }

  // 6 random digits
  for (let i = 0; i < 6; i++) {
    bban += Math.floor(Math.random() * 10).toString();
  }

  // 8 random digits
  for (let i = 0; i < 8; i++) {
    bban += Math.floor(Math.random() * 10).toString();
  }

  // Calculate check digits using MOD-97-10
  // Rearrange: BBAN + country code + "00" (placeholder for check digits)
  const rearranged = bban + countryCode + "00";
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

  // Calculate check digits: 98 - mod97 result, padded to 2 digits
  const checkDigits = (98 - (parseInt(remainder, 10) % 97)).toString().padStart(2, "0");

  return countryCode + checkDigits + bban;
}
