/**
 * Shared formatting utilities for currencies, numbers, and dates
 */

export function formatCurrency(
  value: number | undefined | null,
  currency?: { code?: string; symbol?: string },
): string {
  const symbol = currency?.symbol || "";
  const code = currency?.code || "";
  const numericValue = value ?? 0;

  // Use 5 decimal places for positive fractional values (e.g., gold XAU), otherwise locale default
  const formattedValue =
    numericValue > 0 && numericValue < 0.01 ? numericValue.toFixed(5) : numericValue.toLocaleString();

  // Avoid duplicate display when symbol equals code (e.g., "XAU0 XAU")
  if (symbol && code && symbol === code) {
    return `${formattedValue} ${code}`;
  }

  return `${symbol}${formattedValue} ${code}`.trim();
}

export function formatNumber(num: number, maximumFractionDigits: number = 5): string {
  return num.toLocaleString(undefined, { maximumFractionDigits });
}

export function formatValue(value: number): string {
  return value.toFixed(5).replace(/\.?0+$/, "");
}

export function formatDate(dateString: string, options: { includeTime?: boolean; longMonth?: boolean } = {}): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: options.longMonth ? "long" : "short",
    day: "numeric",
  };

  if (options.includeTime) {
    formatOptions.hour = "2-digit";
    formatOptions.minute = "2-digit";
  }

  return new Date(dateString).toLocaleDateString("en-US", formatOptions);
}
