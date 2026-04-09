export function formatNumber(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString("en-US");
}

const SYMBOL_TO_CODE: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  A$: "AUD",
  C$: "CAD",
  R$: "BRL",
};

function resolveCurrency(currency: string): string {
  if (!currency) return "USD";
  return SYMBOL_TO_CODE[currency] || (currency.length === 3 ? currency : "USD");
}

export function formatCurrency(
  n: number | undefined | null,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: resolveCurrency(currency),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

export function formatPercentage(n: number | undefined | null): string {
  return `${(n ?? 0).toFixed(1)}%`;
}

export function formatDuration(value: number | undefined | null): string {
  let secs = value ?? 0;
  // API may return milliseconds — if value > 1 hour in seconds, assume ms
  if (secs > 3600) secs = secs / 1000;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

export function formatCompact(n: number | undefined | null): string {
  const val = n ?? 0;
  if (val < 1000) return String(val);
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(val);
}

export function formatChange(
  current: number | undefined | null,
  previous: number | undefined | null,
): { text: string; isPositive: boolean } {
  const c = current ?? 0;
  const p = previous ?? 0;
  if (p === 0) {
    return c > 0
      ? { text: "+100% ↑", isPositive: true }
      : { text: "0.0%", isPositive: true };
  }
  const change = ((c - p) / p) * 100;
  const sign = change >= 0 ? "+" : "";
  const arrow = change >= 0 ? "↑" : "↓";
  return {
    text: `${sign}${change.toFixed(1)}% ${arrow}`,
    isPositive: change >= 0,
  };
}
