const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const volumeFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "--";
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number | undefined | null): string {
  if (value == null) return "--";
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 10_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return compactCurrencyFormatter.format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value == null) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number | undefined | null): string {
  if (value == null) return "--";
  return numberFormatter.format(value);
}

const compactLargeFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Compact large dollar values: $45.5B, $980M, $12.3T. */
export function formatLargeCurrency(value: number | undefined | null): string {
  if (value == null) return "--";
  return compactLargeFormatter.format(value);
}

export function formatVolume(value: number | undefined | null): string {
  if (value == null) return "--";
  return volumeFormatter.format(value);
}

export function formatChange(value: number | undefined | null): string {
  if (value == null) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatCurrency(value)}`;
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Timeframe-aware x-axis label: time-of-day intraday, month+day mid-range, month+year long-range. */
export function formatChartLabel(epochMs: number, timeframe: string): string {
  const date = new Date(epochMs);
  if (timeframe === "1D") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (timeframe === "5D") {
    return date.toLocaleString("en-US", { weekday: "short", hour: "numeric" });
  }
  if (timeframe === "1Y" || timeframe === "5Y") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
  }
  return formatDate(epochMs);
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
