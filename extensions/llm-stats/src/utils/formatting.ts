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
 * Formats price from string (e.g., "$0.50/1M tokens" -> "$0.50/1M tokens" with proper formatting)
 * Parses the price value and formats it with toFixed(2)
 */
export function formatPriceFromString(priceStr: string): string {
  const match = priceStr.match(/\$?([\d.]+)/);
  if (!match) {
    return priceStr; // Return original if parsing fails
  }
  const price = parseFloat(match[1]);
  return `$${price.toFixed(2)}/1M`;
}
