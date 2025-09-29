import { validate as validateUuid } from "uuid";

// CUID regex pattern - matches 'c' followed by 24 lowercase alphanumeric characters
const CUID_REGEX = /^c[0-9a-z]{24}$/;

// Maximum supported CUID value
const MAX_SUPPORTED_CUID = "czzzzzzzzzzzzzzzzzzzzzzzz";

/**
 * Converts an integer to a base36 string
 */
function intToBase36(num: bigint): string {
  const base36Chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  if (num === 0n) return "0";

  let result = "";
  while (num > 0n) {
    result = base36Chars[Number(num % 36n)] + result;
    num = num / 36n;
  }
  return result;
}

/**
 * Converts a base36 string to an integer
 */
function base36ToInt(str: string): bigint {
  let result = 0n;
  for (const char of str) {
    const value = parseInt(char, 36);
    if (isNaN(value)) {
      throw new Error(`Invalid base36 character: ${char}`);
    }
    result = result * 36n + BigInt(value);
  }
  return result;
}

/**
 * Validates if a string is a valid CUID
 */
export function isValidCuid(cuid: string): boolean {
  if (!CUID_REGEX.test(cuid)) {
    return false;
  }

  // Compare base36 values properly
  // The max CUID "czzzzzzzzzzzzzzzzzzzzzzz" represents the largest 24-digit base36 number
  // We need to check if the given CUID is within valid range
  const cuidWithoutPrefix = cuid.substring(1);
  const maxWithoutPrefix = MAX_SUPPORTED_CUID.substring(1);

  // Convert to BigInt for proper comparison
  try {
    const cuidValue = base36ToInt(cuidWithoutPrefix);
    const maxValue = base36ToInt(maxWithoutPrefix);
    return cuidValue <= maxValue;
  } catch {
    return false;
  }
}

/**
 * Converts a UUID string to a CUID
 */
export function uuidToCuid(uuidStr: string): string {
  // Remove dashes from UUID
  const cleaned = uuidStr.replace(/-/g, "");

  // Check if the 13th character (version digit) is '0'
  if (cleaned[12] !== "0") {
    throw new Error("Invalid UUID: non-zero version hex digit. Only nil UUIDs (version 0) can be converted to CUIDs.");
  }

  // Remove the version digit (13th character)
  const withoutVersion = cleaned.substring(0, 12) + cleaned.substring(13);

  // Convert hex string to bigint
  let intermediate = 0n;
  for (const char of withoutVersion) {
    const value = parseInt(char, 16);
    intermediate = intermediate * 16n + BigInt(value);
  }

  // Convert bigint to base36 string
  const base36Str = intToBase36(intermediate);

  // Pad with zeros to make it 24 characters
  const padded = base36Str.padStart(24, "0");

  return "c" + padded;
}

/**
 * Converts a CUID to a UUID
 */
export function cuidToUuid(cuid: string): string {
  if (!isValidCuid(cuid)) {
    throw new Error(`Invalid CUID: ${cuid}`);
  }

  // Remove the 'c' prefix
  const cleaned = cuid.substring(1);

  // Convert base36 string to bigint
  const intermediate = base36ToInt(cleaned);

  // Convert bigint to hex string
  let hexStr = intermediate.toString(16);

  // Pad with zeros to make it 31 characters (32 - 1 for the version digit we'll add)
  hexStr = hexStr.padStart(31, "0");

  // Insert the version digit '0' at position 12
  const withVersion = hexStr.substring(0, 12) + "0" + hexStr.substring(12);

  // Format as UUID with dashes
  const uuid = [
    withVersion.substring(0, 8),
    withVersion.substring(8, 12),
    withVersion.substring(12, 16),
    withVersion.substring(16, 20),
    withVersion.substring(20, 32),
  ].join("-");

  return uuid;
}

/**
 * Extracts CUIDs from text
 */
export function extractCuidsFromText(text: string): string[] {
  const cuidPattern = /c[0-9a-z]{24}/g;
  const matches = text.match(cuidPattern) || [];
  return matches.filter(isValidCuid);
}

/**
 * Extracts UUIDs from text
 */
export function extractUuidsFromText(text: string): string[] {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const matches = text.match(uuidPattern) || [];
  return matches.filter((uuid) => {
    // Only accept nil UUIDs (version 0)
    const cleaned = uuid.replace(/-/g, "");
    return cleaned[12] === "0" && validateUuid(uuid);
  });
}
