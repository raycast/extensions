/**
 * Formats large numbers with appropriate suffixes (K, M, B, T)
 */
export function formatNumber(num?: number): string {
  if (typeof num === "undefined" || num === 0) return "0";
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

  if (num < 0.001) {
    return num.toFixed(6);
  }

  if (num < 0.01) {
    return num.toFixed(4);
  }

  return num.toFixed(2);
}

/**
 * Formats token balance with appropriate precision
 */
export function formatTokenBalance(amount: number, symbol: string): string {
  return `${formatNumber(amount)} ${symbol}`;
}
