import { TransactionType } from "./types";

export function formatCurrency(value: number | undefined, currency: string): string {
  if (value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const absoluteValue = Math.abs(value);
  const fractionDigits = absoluteValue >= 1000 ? 2 : absoluteValue >= 1 ? 2 : absoluteValue >= 0.01 ? 4 : 6;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number | undefined, maximumFractionDigits?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const absoluteValue = Math.abs(value);
  const digits =
    maximumFractionDigits ?? (absoluteValue >= 1000 ? 2 : absoluteValue >= 1 ? 2 : absoluteValue >= 0.01 ? 4 : 6);

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function transactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "buy":
      return "Buy";
    case "sell":
      return "Sell";
    case "transfer_in":
      return "Transfer In";
    case "transfer_out":
      return "Transfer Out";
  }
}

export function profitIcon(value: number | undefined): string {
  if (!value) {
    return "•";
  }

  return value > 0 ? "▲" : "▼";
}
