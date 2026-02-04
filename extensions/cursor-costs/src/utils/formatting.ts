import { Icon, getPreferenceValues } from "@raycast/api";
import type { ModelAggregation, MenuBarPreferences, PlanUsage } from "../types";

// Function to sort models by cost (descending)
export function sortModelsByCost(models: ModelAggregation[] | undefined): ModelAggregation[] {
  if (!models) return [];
  return [...models].sort((a, b) => {
    const aCost = a.totalCents ?? 0;
    const bCost = b.totalCents ?? 0;
    return bCost - aCost;
  });
}

// Function to format cents to dollars
// Note: displayFormat and showDollarSign preferences are only for menu bar title
export function formatCents(
  cents: number | null | undefined,
  context?: "menu-bar" | "list" | "detail" | "title",
): string {
  // Handle null, undefined, or NaN values
  if (cents == null || Number.isNaN(cents)) {
    cents = 0;
  }

  const dollarAmount = cents / 100;

  // For menu bar dropdown and list: always show dollar sign and two decimal places
  if (context === "menu-bar" || context === "list" || context === "detail") {
    return `$${dollarAmount.toFixed(2)}`;
  }

  // For title context: use menu bar preferences
  const preferences = getPreferenceValues<MenuBarPreferences>();
  const displayFormat = preferences.displayFormat ?? "2";
  const showDollarSign = preferences.showDollarSign ?? true;

  // Special case for zero amount - show just "0" instead of "0.0" or "0.00"
  if (dollarAmount === 0) {
    return showDollarSign ? "$0" : "0";
  }

  const decimalPlaces = Number.isNaN(Number.parseInt(displayFormat)) ? 2 : Number.parseInt(displayFormat);
  const formattedAmount = dollarAmount.toFixed(decimalPlaces);

  if (showDollarSign) {
    return `$${formattedAmount}`;
  } else {
    return formattedAmount;
  }
}

// Function to get progress icon based on percentage (supports > 100%)
export function getProgressIcon(percentage: number | null | undefined): Icon {
  // Handle null, undefined, or NaN values
  if (percentage == null || Number.isNaN(percentage)) {
    percentage = 0;
  }

  // For percentages >= 95%, show full circle (including over-limit)
  if (percentage >= 95) return Icon.CircleProgress100;
  if (percentage >= 75) return Icon.CircleProgress75;
  if (percentage >= 50) return Icon.CircleProgress50;
  if (percentage >= 25) return Icon.CircleProgress25;
  if (percentage >= 5) return Icon.CircleProgress25;
  return Icon.Circle; // Less than 5% - empty circle
}

// Function to format tokens with k/m/b suffixes (lowercase)
export function formatTokens(tokens: string | number | null | undefined): string {
  if (!tokens) return "0";

  let num: number;
  if (typeof tokens === "string") {
    num = Number.parseInt(tokens, 10);
  } else {
    num = tokens;
  }

  if (Number.isNaN(num) || num < 0) return "0";

  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}b`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}m`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

// Format tokens with full number (for details)
export function formatTokensFull(tokens: string | number | null | undefined): string {
  if (!tokens) return "0";

  let num: number;
  if (typeof tokens === "string") {
    num = Number.parseInt(tokens, 10);
  } else {
    num = tokens;
  }

  if (Number.isNaN(num) || num < 0) return "0";

  return num.toLocaleString();
}

// Function to calculate percentage (supports > 100%)
export function calculatePercentage(value: number | null | undefined, total: number | null | undefined): number {
  // Handle null, undefined, or NaN values
  if (value == null || Number.isNaN(value)) {
    value = 0;
  }
  if (total == null || Number.isNaN(total)) {
    total = 0;
  }

  // No cap at 100% - can exceed limit
  return total > 0 ? (value / total) * 100 : 0;
}

// Format date range as in Cursor dashboard (e.g., "Nov 21 - Dec 21, 2025")
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const formatOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOptions: Intl.DateTimeFormatOptions = { year: "numeric" };

  const startFormatted = start.toLocaleDateString("en-US", formatOptions);
  const endFormatted = end.toLocaleDateString("en-US", formatOptions);
  const year = end.toLocaleDateString("en-US", yearOptions);

  return `${startFormatted} - ${endFormatted}, ${year}`;
}

// Format usage percentage (e.g., "60%" or "105%" if over limit with bonus)
// Note: bonus is added to used (bonus = additional usage gifted by Cursor)
export function formatUsagePercent(
  usedCents: number | null | undefined,
  limitCents: number | null | undefined,
  bonusCents: number | null | undefined = 0,
): string {
  if (usedCents == null || limitCents == null || limitCents === 0) {
    return "N/A";
  }
  const totalUsed = usedCents + (bonusCents ?? 0);
  const percent = Math.round((totalUsed / limitCents) * 100);
  return `${percent}%`;
}

// Format usage as dollar fraction (e.g., "$20.99 / $20.00")
// Note: values are in cents! Bonus is added to used.
export function formatUsageFraction(
  usedCents: number | null | undefined,
  limitCents: number | null | undefined,
  bonusCents: number | null | undefined = 0,
): string {
  if (usedCents == null || limitCents == null) {
    return "N/A";
  }
  const totalUsed = usedCents + (bonusCents ?? 0);
  const usedDollars = (totalUsed / 100).toFixed(2);
  const limitDollars = (limitCents / 100).toFixed(2);
  return `$${usedDollars} / $${limitDollars}`;
}

// Format remaining as dollars
export function formatRemainingCents(remainingCents: number | null | undefined): string {
  if (remainingCents == null) {
    return "N/A";
  }
  const dollars = (remainingCents / 100).toFixed(2);
  return `$${dollars}`;
}

// Calculate total tokens for a model (sum of all token types)
export function calculateTotalTokens(model: ModelAggregation): number {
  const input = Number.parseInt(model.inputTokens || "0", 10) || 0;
  const output = Number.parseInt(model.outputTokens || "0", 10) || 0;
  const cacheWrite = Number.parseInt(model.cacheWriteTokens || "0", 10) || 0;
  const cacheRead = Number.parseInt(model.cacheReadTokens || "0", 10) || 0;

  return input + output + cacheWrite + cacheRead;
}

// Get menu bar title based on settings
export function getMenuBarTitle(
  costCents: number | null | undefined,
  planUsage: PlanUsage | null | undefined,
  displayOption: string = "percent",
): string {
  const option = displayOption;
  const fallbackCost = formatCents(costCents, "title");

  if (!planUsage?.enabled) {
    // If no plan usage data, always show cost from aggregated-usage-events
    return fallbackCost;
  }

  const bonus = planUsage.breakdown?.bonus ?? 0;
  const totalUsed = planUsage.used + bonus;
  const planCost = formatCents(totalUsed, "title");
  const percent = formatUsagePercent(planUsage.used, planUsage.limit, bonus);
  const usage = formatUsageFraction(planUsage.used, planUsage.limit, bonus);

  switch (option) {
    case "cost":
      return planCost;
    case "usage":
      return usage;
    case "percent":
      return percent;
    case "both":
      return `${planCost} • ${percent}`;
    default:
      return percent;
  }
}
