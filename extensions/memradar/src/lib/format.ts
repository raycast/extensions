import type { BuyState, Product } from "./types";

export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Signed percentage at one decimal, always: a rise and a fall are never
 * confused at a glance, and 0 reads as 0.0% so a column of figures lines up
 * instead of one cell looking like a different kind of number.
 */
export function pct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

/** "2026-09-21" -> "21 September 2026". Fixed locale: the store is US English. */
export function longDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-09-21" -> "Sep 21, 2026", for places where the column is narrow. */
export function shortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "2026-09" -> "Sep 2026", for the history table. */
export function monthLabel(month: string): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export const BUY_STATE_LABEL: Record<BuyState, string> = {
  good: "Good time to buy",
  typical: "In line with its 90-day average",
  elevated: "Price is elevated",
};

export function buyStateShort(state?: BuyState): string | undefined {
  if (!state) return undefined;
  return state === "good" ? "Good" : state === "typical" ? "Typical" : "Elevated";
}

/** Percent above the all-time low, the figure that makes a low meaningful. */
export function aboveLow(product: Product): string | undefined {
  if (!product.all_time_low || product.all_time_low.price_usd <= 0) return undefined;
  const pct = Math.round(((product.price_usd - product.all_time_low.price_usd) / product.all_time_low.price_usd) * 100);
  if (pct <= 0) return "at or below its all-time low";
  return `${pct}% above its all-time low`;
}

/**
 * The monthly history, readable at Detail width, newest first throughout: the
 * recent months, then one line per earlier year.
 *
 * A deep product carries 129 months (G.SKILL RipjawsV, back to 2015), and 129
 * table rows is a wall nobody reads, so earlier years collapse to their low,
 * high and closing price, which keeps the decade of shape without the scroll.
 *
 * MONTHS WITH NO RECORDED PRICE ARE OMITTED, NEVER FILLED IN. 151 of 231
 * products have at least one such gap in their recent window, and a dash row
 * would assert a month we never observed; the site's history tables omit gaps
 * for the same reason. The heading therefore does not promise a count, and the
 * span is stated underneath whenever it covers more calendar months than rows.
 */
export function historyMarkdown(product: Product, recentCount = 24): string {
  const history = product.history_monthly ?? [];
  if (!history.length) return "_No recorded history._";

  const recent = history.slice(-recentCount);
  const earlier = history.slice(0, Math.max(0, history.length - recentCount));
  const parts: string[] = ["### Recent months", ""];

  parts.push("| Month | Price |", "| --- | --- |");
  for (const [month, price] of [...recent].reverse()) {
    parts.push(`| ${monthLabel(month)} | ${money(price)} |`);
  }

  const span = monthsBetween(recent[0][0], recent[recent.length - 1][0]);
  if (span > recent.length) {
    parts.push(
      "",
      `_${recent.length} recorded months, ${monthLabel(recent[0][0])} to ${monthLabel(recent[recent.length - 1][0])}. Months with no recorded price are omitted._`,
    );
  }

  if (earlier.length) {
    const byYear = new Map<string, number[]>();
    for (const [month, price] of earlier) {
      const year = month.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)?.push(price);
    }
    parts.push("", `### ${byYear.size === 1 ? "Earlier year" : "Earlier years"}`, "");
    parts.push("| Year | Low | High | Year end |", "| --- | --- | --- | --- |");
    for (const [year, prices] of [...byYear].reverse()) {
      parts.push(
        `| ${year} | ${money(Math.min(...prices))} | ${money(Math.max(...prices))} | ${money(prices[prices.length - 1])} |`,
      );
    }
  }

  return parts.join("\n");
}

/** Inclusive count of calendar months from one YYYY-MM to another. */
function monthsBetween(from: string, to: string): number {
  const index = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7));
  return index(to) - index(from) + 1;
}

/** The narrow side pane gets fewer rows and no yearly block. */
export function historyTable(product: Product, maxRows = 12): string {
  const history = product.history_monthly ?? [];
  if (!history.length) return "_No recorded history._";
  const rows = [...history].reverse().slice(0, maxRows);
  const lines = ["| Month | Price |", "| --- | --- |", ...rows.map(([m, v]) => `| ${monthLabel(m)} | ${money(v)} |`)];
  if (history.length > rows.length) {
    lines.push("", `_${history.length} months recorded; press Enter for the full history._`);
  }
  return lines.join("\n");
}
