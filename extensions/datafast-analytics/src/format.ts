export function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDecimal(value: number | undefined, maximumFractionDigits = 1): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0%";
  }

  return `${formatDecimal(value, 2)}%`;
}

export function formatCurrency(value: number | undefined, currency?: string | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return currency ? formatMoney(0, currency) : "0";
  }

  return currency ? formatMoney(value, currency) : formatDecimal(value, 2);
}

export function formatDuration(seconds: number | undefined): string {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "0s";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function truncate(value: string | null | undefined, length = 80): string {
  if (!value) {
    return "";
  }

  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${formatDecimal(value, 2)} ${currency}`;
  }
}
