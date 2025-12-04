/**
 * Generates a zero-padded 2-digit string
 * @param value Number or string
 * @returns Zero-padded 2-digit string
 * @example
 * pad2(1) // "01"
 * pad2("1") // "01"
 */
export const pad2 = (value: string | number): string => {
  return value.toString().padStart(2, "0");
};
