export type PeriodKey = "today" | "week" | "month";

export const periodLabels: Record<PeriodKey, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

export function getPeriodRange(period: PeriodKey) {
  const end = new Date();
  const start = new Date(end);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export function formatTokens(tokens: number) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return formatNumber(tokens);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export function formatCurrency(value: number, currency: string) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: value >= 10 ? 2 : 4,
  }).format(value);
  return formatted.replace(/\bUS\$/g, "$");
}

/** Currency for dashboards: always two digits after the decimal separator. */
export function formatCurrencyMoney(value: number, currency: string) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return formatted.replace(/\bUS\$/g, "$");
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function renderBudgetBar(
  spend: number,
  budget: number,
  currency: string,
) {
  const percent = budget > 0 ? Math.min(spend / budget, 1) : 0;
  const filled = Math.round(percent * 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return `${bar} ${Math.round(percent * 100)}% (${formatCurrency(spend, currency)} / ${formatCurrency(budget, currency)})`;
}
