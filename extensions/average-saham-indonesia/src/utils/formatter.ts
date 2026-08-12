/**
 * Formats a whole number using Indonesian thousands separators.
 * Example: 240455 -> "240.455"
 */
const groupThousands = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
}).format;

/**
 * Formats a value as Rupiah currency, rounded to the nearest whole number.
 * Example: 240455 -> "Rp240.455"
 */
export function formatCurrency(value: number): string {
  return `Rp${groupThousands(Math.round(value))}`;
}

/**
 * Formats a share price as Rupiah with up to 2 decimal places, using proper
 * Indonesian number formatting: "." groups thousands and "," separates the
 * decimal part, so the two never collide (e.g. "Rp9.250,25", not the
 * ambiguous "Rp9.250.25").
 * Examples: 96.18 -> "Rp96,18", 100 -> "Rp100", 9250.25 -> "Rp9.250,25"
 */
const formatPriceNumber = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
}).format;

export function formatPrice(value: number): string {
  return `Rp${formatPriceNumber(value)}`;
}

/**
 * Formats a lot amount, e.g. 25 -> "25 Lot"
 */
export function formatLot(value: number): string {
  return `${groupThousands(Math.round(value))} Lot`;
}
