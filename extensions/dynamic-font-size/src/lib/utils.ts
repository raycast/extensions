// Base root font-size in pixels. 1rem === REM_BASE px.
export const REM_BASE = 16;

/** Round to at most 4 decimal places, dropping insignificant trailing zeros. */
export function roundNumber(value: number): number {
  return parseFloat(value.toFixed(4));
}

/** Format a number as a clean string (no float noise, no trailing zeros). */
export function formatNumber(value: number): string {
  return String(roundNumber(value));
}

/**
 * Parse user input into a finite number.
 * A comma is accepted as a decimal separator (e.g. "1,5" -> 1.5) for locale friendliness.
 * Returns null for anything that isn't a single clean decimal number.
 */
export function parseNumericInput(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, ".");

  // One optional integer part, one optional fractional part, at least one digit overall.
  // Rejects "", ".", "1.", "1.2.3", "1,5,5", "12px", etc.
  if (!/^\d*\.?\d+$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Convert a raw numeric string between px and rem when the measurement unit changes.
 * Invalid input is returned untouched so the user never loses what they typed.
 */
export function convertBetweenUnits(raw: string, from: TUnit, to: TUnit): string {
  if (from === to) {
    return raw;
  }

  const value = parseNumericInput(raw);
  if (value === null) {
    return raw;
  }

  const converted = to === "rem" ? value / REM_BASE : value * REM_BASE;
  return formatNumber(converted);
}
