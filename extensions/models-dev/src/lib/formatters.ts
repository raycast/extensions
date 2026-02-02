/**
 * Format price per million tokens for display
 */
export function formatPrice(pricePerMillion: number | undefined): string {
  if (pricePerMillion === undefined) return "N/A";
  if (pricePerMillion === 0) return "Free";
  if (pricePerMillion < 0.01) return `$${pricePerMillion.toFixed(4)}/M`;
  if (pricePerMillion < 1) return `$${pricePerMillion.toFixed(3)}/M`;
  return `$${pricePerMillion.toFixed(2)}/M`;
}

/**
 * Format price with fixed width for aligned display in lists
 * Pads to accommodate up to 3-digit integer part (e.g., "$999.00/M")
 */
export function formatPriceFixed(pricePerMillion: number | undefined): string {
  const price = formatPrice(pricePerMillion);
  // Target width: "$999.00/M" = 9 chars
  return price.padStart(9);
}

/**
 * Format context window size for display
 */
export function formatContextWindow(tokens: number | undefined): string {
  if (tokens === undefined) return "N/A";
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const thousands = tokens / 1_000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }
  return `${tokens}`;
}

/**
 * Format knowledge cutoff date
 */
export function formatKnowledgeCutoff(date: string | undefined): string {
  if (!date) return "Unknown";
  // Date is already in YYYY-MM or YYYY-MM-DD format
  return date;
}

/**
 * Get pricing tier based on input price
 */
export type PricingTier = "free" | "budget" | "standard" | "premium";

export function getPricingTier(inputPrice: number | undefined): PricingTier {
  if (inputPrice === undefined || inputPrice === 0) return "free";
  if (inputPrice < 1) return "budget";
  if (inputPrice < 10) return "standard";
  return "premium";
}

/**
 * Format modalities array for display
 */
export function formatModalities(modalities: string[]): string {
  if (modalities.length === 0) return "None";
  return modalities.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ");
}

/**
 * Format release date for display
 */
export function formatDate(date: string | undefined): string {
  if (!date) return "Unknown";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return date;
  }
}

/**
 * Format last updated timestamp
 */
export function formatUpdatedAt(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return null;
  }
}

/**
 * Format token count with commas
 */
export function formatTokenCount(count: number): string {
  return count.toLocaleString();
}

/**
 * Estimate cost for a given number of tokens
 */
export function estimateCost(tokens: number, pricePerMillion: number): string {
  const cost = (tokens / 1_000_000) * pricePerMillion;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}
