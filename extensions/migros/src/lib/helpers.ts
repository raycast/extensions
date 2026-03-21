import { NutrientsTableRow, ProductCard, StoreInfo } from "./api/migrosApi";

// ─────────────────────────────────────────────────────────────────────────────
// String Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock & Store Helpers
// ─────────────────────────────────────────────────────────────────────────────

export type StockStatus = "out-of-stock" | "low-stock" | "in-stock";

export interface StockInfo {
  stockNum: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  stockText: string;
  status: StockStatus;
}

export function getStockInfo(stock: number | string): StockInfo {
  const stockNum = typeof stock === "string" ? parseInt(stock, 10) : stock;
  const isOutOfStock = isNaN(stockNum) || stockNum <= 0;
  const isLowStock = !isOutOfStock && stockNum <= 5;
  const stockText = isOutOfStock ? "Out of stock" : `${stockNum} in stock`;
  const status: StockStatus = isOutOfStock ? "out-of-stock" : isLowStock ? "low-stock" : "in-stock";
  return { stockNum, isOutOfStock, isLowStock, stockText, status };
}

export function getStoreDisplayInfo(store: StoreInfo): { storeId: string; storeName: string } {
  const storeId = store.costCenterId || store.storeId || "";
  const storeName = store.storeName || store.name || "Unknown Store";
  return { storeId, storeName };
}

// ─────────────────────────────────────────────────────────────────────────────
// Image URL Helper
// ─────────────────────────────────────────────────────────────────────────────

export type ImageSize = "original" | "thumbnail";

/**
 * Get product image URL with optional size optimization.
 * - "original": Full resolution image (for detail view)
 * - "thumbnail": Optimized small image (for list view, ~64x64)
 */
export function getProductImageUrl(product: ProductCard, size: ImageSize = "original"): string | undefined {
  const processUrl = (url: string) => {
    if (size === "thumbnail") {
      // Use optimized thumbnail: mo-custom with small dimensions
      return url.replace("{stack}", "mo-custom/v-w-64-h-64");
    }
    // Use original for full quality
    return url.replace("{stack}", "original");
  };

  if (product.imageTransparent?.url) {
    return processUrl(product.imageTransparent.url);
  }
  if (product.images && product.images.length > 0) {
    return processUrl(product.images[0].url);
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Price Formatting
// ─────────────────────────────────────────────────────────────────────────────
export function formatPrice(product: ProductCard, options: { includeBadges?: boolean } = {}): string {
  const { includeBadges = true } = options;
  const offer = product.offer;
  if (!offer) return "";

  let priceText = "";

  // Check for promotion price first
  if (offer.promotionPrice?.effectiveValue !== undefined) {
    const promoPrice = offer.promotionPrice.effectiveValue;
    const originalPrice = offer.price?.effectiveValue ?? offer.price?.value;
    if (originalPrice !== undefined) {
      const insteadOf = offer.priceInsteadOfLabel || "instead of";
      priceText = `CHF ${promoPrice.toFixed(2)} (${insteadOf} ${originalPrice.toFixed(2)})`;
    } else {
      priceText = `CHF ${promoPrice.toFixed(2)}`;
    }
  } else if (offer.price?.effectiveValue !== undefined) {
    priceText = `CHF ${offer.price.effectiveValue.toFixed(2)}`;
  } else if (offer.price?.value !== undefined) {
    priceText = `CHF ${offer.price.value.toFixed(2)}`;
  }

  // Append promotion badges (optional)
  if (includeBadges && priceText && offer.badges && offer.badges.length > 0) {
    const badgeText = offer.badges.map((b) => b.description).join(" · ");
    priceText += ` — ${badgeText}`;
  }

  return priceText;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating Formatting
// ─────────────────────────────────────────────────────────────────────────────

export interface RatingDisplay {
  starsDisplay: string;
  ratingText: string;
}

/**
 * Format a numeric rating (e.g., 4.3) into stars display.
 * Returns full stars (★), empty stars (☆), and formatted text.
 */
export function formatRating(nbStars: number, nbReviews: number): RatingDisplay {
  const fullStars = Math.floor(nbStars);
  const emptyStars = 5 - fullStars;
  const starsDisplay = "★".repeat(fullStars) + "☆".repeat(emptyStars);
  const ratingText = `${starsDisplay} ${nbStars.toFixed(1)} (${nbReviews})`;
  return { starsDisplay, ratingText };
}

// ─────────────────────────────────────────────────────────────────────────────
// Nutrition Table Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get FSA level indicator emoji for nutrition values.
 * LOW = green, MEDIUM = yellow, HIGH = red
 */
export function getFsaIndicator(fsaLevel?: string): string {
  switch (fsaLevel) {
    case "LOW":
      return "🟢";
    case "MEDIUM":
      return "🟡";
    case "HIGH":
      return "🔴";
    default:
      return "";
  }
}

/**
 * Format a nutrition label, truncating if too long.
 */
export function formatNutritionLabel(label: string, maxLength: number = 20): string {
  const escapedLabel = label.replace(/\|/g, "\\|");
  if (escapedLabel.length > maxLength) {
    return escapedLabel.slice(0, maxLength - 1) + "…";
  }
  return escapedLabel;
}

/**
 * Format nutrition table rows into a markdown table.
 */
export function formatNutritionTableMarkdown(
  rows: NutrientsTableRow[],
  headerLabel: string,
  per100gLabel: string,
): string {
  if (rows.length === 0) return "";

  let markdown = `\n\n### ${headerLabel}\n`;
  markdown += `| | ${per100gLabel} |\n`;
  markdown += `|---|---:|\n`;

  for (const row of rows) {
    const label = formatNutritionLabel(row.label);
    const value = (row.values[0] || "-").replace(/\|/g, "\\|");
    const fsaIndicator = getFsaIndicator(row.fsaLevel);
    const labelWithFsa = fsaIndicator ? `${label} ${fsaIndicator}` : label;
    markdown += `| ${labelWithFsa} | ${value} |\n`;
  }

  return markdown;
}
