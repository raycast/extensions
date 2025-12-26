/**
 * Converts UF amount to CLP
 */
export function convertUFToCLP(ufAmount: number, ufValue: number): number {
  return ufAmount * ufValue;
}

/**
 * Converts CLP amount to UF
 */
export function convertCLPToUF(clpAmount: number, ufValue: number): number {
  return clpAmount / ufValue;
}

/**
 * Formats UF value with 4 decimal places
 */
export function formatUF(uf: number): string {
  return uf.toFixed(4);
}

/**
 * Formats CLP value with no decimals and thousand separators
 */
export function formatCLP(clp: number): string {
  return Math.round(clp).toLocaleString("es-CL");
}

/**
 * Formats UF value for clipboard (just the number, no decimals if whole number)
 */
export function formatUFForClipboard(uf: number): string {
  // If it's a whole number, return without decimals
  if (uf % 1 === 0) {
    return uf.toString();
  }
  return uf.toFixed(4);
}

/**
 * Formats CLP value for clipboard (just the number, no formatting)
 */
export function formatCLPForClipboard(clp: number): string {
  return Math.round(clp).toString();
}
