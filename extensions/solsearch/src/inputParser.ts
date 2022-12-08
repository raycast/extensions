/**
 * Enum with parsed type
 */
export enum SolType {
  TRANSACTION = "🧾  Transaction",
  ADDRESS = "📒  Address",
  BLOCK = "🔗  Block",
  UNKNOWN = "",
}

function isNumber(str: string): boolean {
  if (str.trim() === "") {
    return false;
  }

  return !Number.isNaN(Number(str));
}

function isBase58(str: string): boolean {
  return /^[A-HJ-NP-Za-km-z1-9]*$/.test(str);
}

/**
 * Try to parse input value (from search or clipboard) and returns corresponding enum value
 * @param input value from search or clipboard
 */
export function parseInput(input: string): SolType {
  if (isNumber(input) && input.length < 32) {
    return SolType.BLOCK;
  }

  if (!isBase58(input) || input.length < 32) {
    return SolType.UNKNOWN;
  }

  if (input.length >= 32 && input.length <= 44) {
    return SolType.ADDRESS;
  }

  return SolType.TRANSACTION;
}
