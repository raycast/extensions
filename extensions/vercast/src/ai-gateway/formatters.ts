const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const shareFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatCompactNumber(value: number): string {
  return Number.isFinite(value) ? compactNumberFormatter.format(value) : "—";
}

export function formatShare(percent: number): string {
  return Number.isFinite(percent) ? shareFormatter.format(percent / 100) : "—";
}

export function formatCurrency(value: number, currency = "USD"): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (value !== 0 && Math.abs(value) < 0.0001) {
    return `${value < 0 ? "-" : ""}<${new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(0.0001)}`;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
  }).format(value);
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "—";
  }
  if (milliseconds < 1) {
    return `${milliseconds.toFixed(2)} ms`;
  }
  if (milliseconds < 1_000) {
    return `${Math.round(milliseconds)} ms`;
  }
  if (milliseconds < 60_000) {
    return `${(milliseconds / 1_000).toFixed(milliseconds < 10_000 ? 2 : 1)} s`;
  }

  const totalSeconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatDate(value: string | number | Date): string {
  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? "—" : shortDateFormatter.format(date);
}
