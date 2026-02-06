import { Color, Icon } from "@raycast/api";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy h:mm a");
}

export function getRelativeDate(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return "****";
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return "****";
  const last4 = accountNumber.slice(-4);
  return `****${last4}`;
}

export function getTransactionIcon(amount: number): {
  source: Icon;
  tintColor: Color;
} {
  if (amount > 0) {
    return { source: Icon.ArrowDown, tintColor: Color.Green };
  }
  return { source: Icon.ArrowUp, tintColor: Color.Red };
}

export function getTransactionStatusIcon(status: string): {
  source: Icon;
  tintColor: Color;
} {
  switch (status) {
    case "completed":
    case "posted":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "sent":
      return { source: Icon.ArrowUp, tintColor: Color.Blue };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Orange };
    case "processing":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "cancelled":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function getCardStatusIcon(status: string): {
  source: Icon;
  tintColor: Color;
} {
  switch (status) {
    case "active":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "frozen":
      return { source: Icon.Snowflake, tintColor: Color.Blue };
    case "cancelled":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "inactive":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "expired":
      return { source: Icon.Clock, tintColor: Color.Orange };
    case "suspended":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function getInvoiceStatusIcon(status: string): {
  source: Icon;
  tintColor: Color;
} {
  switch (status) {
    case "Paid":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "Unpaid":
      return { source: Icon.Document, tintColor: Color.Orange };
    case "Processing":
      return { source: Icon.Clock, tintColor: Color.Blue };
    case "Cancelled":
      return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function getAccountStatusColor(status: string): Color {
  switch (status) {
    case "active":
      return Color.Green;
    case "pending":
      return Color.Orange;
    case "deleted":
    case "archived":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}