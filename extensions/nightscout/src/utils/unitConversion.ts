/**
 * Converts a glucose value from mg/dL to mmol/L
 * @param mgdl - glucose value in mg/dL
 * @returns glucose value in mmol/L
 */
function mgdlToMMOL(mgdl: number): number {
  return Math.round((mgdl / 18.018018018) * 10) / 10;
}

/**
 * Converts a glucose value from mg/dL to the specified display unit
 * @param mgdlValue - glucose value in mg/dL (always the input format)
 * @param useMmol - whether to convert to mmol/L for display
 * @returns the glucose value in the requested unit
 */
function convertGlucoseForDisplay(mgdlValue: number, useMmol: boolean): number {
  return useMmol ? mgdlToMMOL(mgdlValue) : mgdlValue;
}

/**
 * Formats a glucose value with units for display
 * @param mgdlValue - glucose value in mg/dL (always the input format)
 * @param useMmol - whether to convert to mmol/L for display
 * @returns formatted string with value and units
 */
function formatGlucoseWithUnits(mgdlValue: number, useMmol: boolean): string {
  if (useMmol) {
    const mmolValue = mgdlToMMOL(mgdlValue);
    return `${mmolValue.toFixed(1)} mmol/L`;
  }
  return `${mgdlValue} mg/dL`;
}

export { mgdlToMMOL, convertGlucoseForDisplay, formatGlucoseWithUnits };
