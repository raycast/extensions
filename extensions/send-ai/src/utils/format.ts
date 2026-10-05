/**
 * Formats large numbers with appropriate suffixes (K, M, B, T)
 */
export function formatNumber(num: number): string {
  if (!num) return "0";
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + "T";
  }

  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + "B";
  }

  if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + "M";
  }

  if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + "K";
  }

  return num.toFixed(2);
}

/**
 * Formats token balance with appropriate precision
 */
export function formatTokenBalance(amount: number, symbol: string): string {
  const precision = amount < 1 ? 6 : 4;
  return `${amount.toFixed(precision)} ${symbol}`;
}

/**
 * Formats USD amounts with appropriate precision
 */
export function formatUsdAmount(amount: number): string {
  if (amount >= 1000) {
    return formatNumber(amount);
  }

  if (amount >= 1) {
    return amount.toFixed(2);
  }

  return amount.toFixed(4);
}

/**
 * Formats percentage with appropriate precision
 */
export function formatPercentage(percentage: number): string {
  const formatted = percentage.toFixed(2);
  return `${percentage >= 0 ? "+" : ""}${formatted}%`;
}

/**
 * Formats price with appropriate precision based on value
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return formatNumber(price);
  }

  if (price >= 1) {
    return price.toFixed(4);
  }

  if (price >= 0.01) {
    return price.toFixed(6);
  }

  return price.toFixed(8);
}
