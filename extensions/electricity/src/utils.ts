import { Color, Icon, getPreferenceValues } from "@raycast/api";
import { PriceRow, Preferences } from "./api";

/**
 * Price tier types
 */
export type PriceTier = "cheap" | "average" | "high" | "expensive";

interface TierInfo {
  tier: PriceTier;
  label: string;
  emoji: string;
  color: Color;
  icon: Icon;
}

/**
 * Get price thresholds from user preferences
 */
function getThresholds(): { cheap: number; average: number; high: number } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    cheap: parseFloat(prefs.cheapThreshold) || 5,
    average: parseFloat(prefs.averageThreshold) || 10,
    high: parseFloat(prefs.highThreshold) || 20,
  };
}

/**
 * Get price tier based on price value and user-defined thresholds
 */
export function getPriceTier(price: number): TierInfo {
  const thresholds = getThresholds();

  if (price < thresholds.cheap) {
    return { tier: "cheap", label: "Cheap", emoji: "🟢", color: Color.Green, icon: Icon.CheckCircle };
  } else if (price < thresholds.average) {
    return { tier: "average", label: "Average", emoji: "🔵", color: Color.Blue, icon: Icon.Minus };
  } else if (price < thresholds.high) {
    return { tier: "high", label: "High", emoji: "🟠", color: Color.Orange, icon: Icon.ArrowUp };
  } else {
    return { tier: "expensive", label: "Expensive", emoji: "🔴", color: Color.Red, icon: Icon.Warning };
  }
}

/**
 * Format price with comma decimal separator
 */
export function formatPrice(cents: number, decimals = 2): string {
  return cents.toFixed(decimals).replace(".", ",");
}

/**
 * Calculate average price from rows
 */
export function calculateAverage(rows: PriceRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, r) => sum + r.retailCentsPerKwh, 0) / rows.length;
}

/**
 * Find the cheapest hour
 */
export function findCheapestHour(rows: PriceRow[]): PriceRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((min, r) => (r.retailCentsPerKwh < min.retailCentsPerKwh ? r : min));
}

/**
 * Find the most expensive hour
 */
export function findMostExpensiveHour(rows: PriceRow[]): PriceRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((max, r) => (r.retailCentsPerKwh > max.retailCentsPerKwh ? r : max));
}

/**
 * Generate smart recommendation based on current price analysis
 */
export function generateRecommendation(current: PriceRow, nextHour: PriceRow | null, cheapest: PriceRow): string {
  const { tier } = getPriceTier(current.retailCentsPerKwh);
  const currentPrice = formatPrice(current.retailCentsPerKwh);

  if (tier === "cheap") {
    return `⚡ ${currentPrice} s/kWh - Cheap! Use now 🟢`;
  }

  if (tier === "expensive") {
    const cheapestHour = cheapest.hour;
    const cheapestPrice = formatPrice(cheapest.retailCentsPerKwh);
    return `⚡ ${currentPrice} s/kWh - Expensive! Wait for ${cheapestHour} (${cheapestPrice} s/kWh) 🔴`;
  }

  if (tier === "high") {
    return `⚡ ${currentPrice} s/kWh - High but tolerable 🟠`;
  }

  // Average tier - check if next hour is better
  if (nextHour && nextHour.retailCentsPerKwh < current.retailCentsPerKwh * 0.9) {
    const nextPrice = formatPrice(nextHour.retailCentsPerKwh);
    return `⚡ ${currentPrice} s/kWh - Wait! Drops to ${nextPrice} s/kWh at ${nextHour.hour} ↘️`;
  }

  return `⚡ ${currentPrice} s/kWh - Average price 🔵`;
}

/**
 * Format hour for display
 */
export function formatHour(row: PriceRow): string {
  return row.moment.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Check if a price row is for the current hour
 */
export function isCurrentHour(row: PriceRow): boolean {
  const now = new Date();
  return (
    row.moment.getFullYear() === now.getFullYear() &&
    row.moment.getMonth() === now.getMonth() &&
    row.moment.getDate() === now.getDate() &&
    row.moment.getHours() === now.getHours()
  );
}

/**
 * Result of finding the best consumption window
 */
export interface BestWindow {
  startIndex: number;
  endIndex: number;
  hours: PriceRow[];
  averagePrice: number;
  totalCost: number;
  startTime: string;
  endTime: string;
}

/**
 * Find the best (cheapest) consecutive N-hour window
 * Uses sliding window algorithm to find the window with lowest average price
 */
export function findBestWindow(rows: PriceRow[], windowSize: number): BestWindow | null {
  if (rows.length === 0 || windowSize <= 0 || windowSize > rows.length) {
    return null;
  }

  // Calculate initial window sum
  let windowSum = 0;
  for (let i = 0; i < windowSize; i++) {
    windowSum += rows[i].retailCentsPerKwh;
  }

  let bestSum = windowSum;
  let bestStartIndex = 0;

  // Slide the window
  for (let i = 1; i <= rows.length - windowSize; i++) {
    windowSum = windowSum - rows[i - 1].retailCentsPerKwh + rows[i + windowSize - 1].retailCentsPerKwh;
    if (windowSum < bestSum) {
      bestSum = windowSum;
      bestStartIndex = i;
    }
  }

  const hours = rows.slice(bestStartIndex, bestStartIndex + windowSize);
  const startRow = hours[0];
  const endRow = hours[hours.length - 1];

  // Format end time (add 1 hour to the last hour's start)
  const endMoment = new Date(endRow.moment);
  endMoment.setHours(endMoment.getHours() + 1);
  const endTime = endMoment.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

  return {
    startIndex: bestStartIndex,
    endIndex: bestStartIndex + windowSize - 1,
    hours,
    averagePrice: bestSum / windowSize,
    totalCost: bestSum,
    startTime: startRow.hour,
    endTime,
  };
}
