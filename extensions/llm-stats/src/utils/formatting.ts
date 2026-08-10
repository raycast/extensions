/**
 * Formats parameter count (e.g., 7000000000 -> "7.0B")
 */
export function formatParamCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Formats context size (e.g., 128000 -> "128.0K tokens")
 */
export function formatContextSize(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M tokens`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K tokens`;
  }
  return `${tokens} tokens`;
}

/**
 * Formats price per million tokens (e.g., 0.5 -> "$0.50/1M tokens")
 */
export function formatPrice(pricePerMillion: number): string {
  return `$${pricePerMillion.toFixed(2)}/1M tokens`;
}

/**
 * Formats a price for display (e.g., "$0.50/1M tokens" -> "$0.50/1M").
 * Accepts either a formatted string or a raw numeric value (the API returns
 * numbers for some models), so coerce before matching.
 */
export function formatPriceFromString(priceStr: string | number): string {
  const str = String(priceStr);
  const match = str.match(/\$?([\d.]+)/);
  if (!match) {
    return str; // Return original if parsing fails
  }
  const price = parseFloat(match[1]);
  return `$${price.toFixed(2)}/1M`;
}
