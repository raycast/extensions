import { Money } from "./money";

export type BillingInterval = "day" | "week" | "month" | "year";

/** Shown in the Subscriptions detail so the numbers can be explained. */
export const MRR_RULE = [
  "MRR counts **active** and **past due** subscriptions. Trials, paused and cancelled subscriptions count as zero.",
  "",
  "Each subscription contributes unit price × quantity, minus discounts that apply forever when the provider exposes them, normalized to one month:",
  "",
  "- yearly ÷ 12",
  "- quarterly (every 3 months) ÷ 3",
  "- every N months ÷ N",
  "- weekly × 52 ÷ 12",
  "- daily × 365 ÷ 12",
  "",
  "Totals in other currencies are converted with the daily ECB reference rate.",
].join("\n");

/** How many times per month an interval of `count` × `interval` bills. */
export function monthlyFactor(interval: BillingInterval, count = 1): number {
  const n = count > 0 ? count : 1;
  switch (interval) {
    case "day":
      return 365 / 12 / n;
    case "week":
      return 52 / 12 / n;
    case "month":
      return 1 / n;
    case "year":
      return 1 / (12 * n);
  }
}

export function toMonthly(amount: Money, interval: BillingInterval, count = 1): Money {
  return { amountMinor: Math.round(amount.amountMinor * monthlyFactor(interval, count)), currency: amount.currency };
}

export function parseInterval(value: string | null | undefined): BillingInterval | undefined {
  switch (value) {
    case "day":
    case "week":
    case "month":
    case "year":
      return value;
    default:
      return undefined;
  }
}

export type Discount =
  { type: "percent"; percent: number } | { type: "amount"; amountMinor: number; currency: string; perUnit?: boolean };

/**
 * Applies forever-discounts to a per-interval amount (before normalization). Fixed amounts in another currency are
 * ignored, since we cannot convert them reliably here. The result never goes below zero.
 */
export function applyDiscounts(amount: Money, quantity: number, discounts: Discount[]): Money {
  let value = amount.amountMinor;
  for (const discount of discounts) {
    if (discount.type === "percent") {
      value -= Math.round((value * Math.min(100, Math.max(0, discount.percent))) / 100);
    } else if (discount.currency === amount.currency) {
      value -= discount.perUnit ? discount.amountMinor * quantity : discount.amountMinor;
    }
  }
  return { amountMinor: Math.max(0, value), currency: amount.currency };
}

export function intervalLabel(interval: BillingInterval, count = 1): string {
  if (count === 1) {
    return { day: "daily", week: "weekly", month: "monthly", year: "yearly" }[interval];
  }
  if (interval === "month" && count === 3) return "quarterly";
  return `every ${count} ${interval}s`;
}
