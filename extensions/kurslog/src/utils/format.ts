export function formatNumber(value: number): string {
  if (isNaN(value)) return "";
  if (Math.abs(value) < 10000) {
    if (Number.isInteger(value)) {
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    const decimalPart = value.toString().split(".")[1];
    const firstDecimalDigit = decimalPart ? decimalPart[0] : "0";
    const formatted =
      firstDecimalDigit === "0" ? value.toFixed(3) : value.toFixed(2);
    return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatRate(rateIn: number, rateOut: number): string {
  if (!rateIn || !rateOut) return "N/A";
  const ratio = rateOut / rateIn;
  return formatNumber(ratio);
}

export function formatTotal(
  amount: number,
  rateIn: number,
  rateOut: number,
): string {
  if (!rateIn || !rateOut || !amount) return "";
  const total = (amount * rateOut) / rateIn;
  return formatNumber(total);
}

/**
 * Format rate for list display, with inversion for very small rates (< 0.1).
 * Returns: "1 FROM ≈ X TO" or "X FROM ≈ 1 TO" for inverted rates.
 */
export function formatListRate(
  rateIn: number,
  rateOut: number,
  fromName: string,
  toName: string,
): string {
  if (!rateIn || !rateOut) return "—";
  const ratio = rateOut / rateIn;
  if (ratio >= 0.1) {
    return `1 ${fromName} ≈ ${formatNumber(ratio)} ${toName}`;
  }
  // Invert: show how many FROM per 1 TO
  const inverted = rateIn / rateOut;
  return `${formatNumber(inverted)} ${fromName} ≈ 1 ${toName}`;
}

/**
 * Format rate as a simple string "1 FROM = X TO" for detail views.
 */
export function formatRateDisplay(
  rateIn: number,
  rateOut: number,
  fromName: string,
  toName: string,
): string {
  if (!rateIn || !rateOut) return "N/A";
  const ratio = rateOut / rateIn;
  if (ratio >= 0.1) {
    return `1 ${fromName} = ${formatNumber(ratio)} ${toName}`;
  }
  const inverted = rateIn / rateOut;
  return `${formatNumber(inverted)} ${fromName} = 1 ${toName}`;
}

/**
 * Format amount calculation: "X FROM = Y TO"
 */
export function formatCalculation(
  amount: number,
  rateIn: number,
  rateOut: number,
  fromName: string,
  toName: string,
): string {
  if (!rateIn || !rateOut || !amount) return "";
  const total = (amount * rateOut) / rateIn;
  return `${formatNumber(amount)} ${fromName} = ${formatNumber(total)} ${toName}`;
}
