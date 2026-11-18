import { Color, Icon, List } from "@raycast/api";
import { MinorUnitAmount, StarlingAccount } from "./types";

const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
};

function getDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2;
}

export function minorUnitsToMajor(amount: MinorUnitAmount | undefined, fallbackCurrency: string): number {
  if (!amount) return 0;
  const currency = (amount.currency ?? fallbackCurrency).toUpperCase();
  const decimals = getDecimals(currency);
  return amount.minorUnits / 10 ** decimals;
}

export function formatAmount(amount: MinorUnitAmount | undefined, fallbackCurrency: string): string {
  if (!amount) return "-";

  const currency = (amount.currency ?? fallbackCurrency).toUpperCase();
  const value = minorUnitsToMajor(amount, fallbackCurrency);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: getDecimals(currency),
  }).format(value);
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeDate(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(diffDays) >= 1) {
    return formatter.format(diffDays, "day");
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  return formatter.format(diffHours, "hour");
}

export function accountDisplayName(account: StarlingAccount): string {
  return account.name?.trim() || account.accountType || account.accountUid;
}

export function accountCategoryUid(account: StarlingAccount): string | undefined {
  return account.defaultCategory ?? account.defaultCategoryUid;
}

export function transactionDirectionAccessory(direction: string | undefined): List.Item.Accessory | undefined {
  if (!direction) return undefined;

  const normalized = direction.toUpperCase();
  if (normalized === "OUT") {
    return { icon: { source: Icon.ArrowUp, tintColor: Color.Red }, tooltip: "Outgoing" };
  }
  if (normalized === "IN") {
    return { icon: { source: Icon.ArrowDown, tintColor: Color.Green }, tooltip: "Incoming" };
  }

  return { text: direction };
}

export function statusColor(status: string | undefined): Color {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
    case "SETTLED":
    case "ENABLED":
    case "LIVE":
      return Color.Green;
    case "PENDING":
    case "PENDING_OUTGOING":
      return Color.Orange;
    case "CANCELLED":
    case "DISABLED":
    case "FAILED":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function statusText(status: string | undefined): string {
  if (!status) return "Unknown";
  if ((status ?? "").toUpperCase() === "CANCELLED") return "Canceled";
  return status
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
