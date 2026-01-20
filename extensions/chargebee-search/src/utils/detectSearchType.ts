import { SearchType } from "../types/chargebee";

export function detectSearchType(input: string): SearchType {
  const trimmed = input.trim();

  // Credit note: starts with CN- or TEST-CN-
  if (trimmed.startsWith("CN-") || trimmed.startsWith("TEST-CN-")) {
    return "credit_note";
  }

  // Invoice: purely numeric
  if (/^\d+$/.test(trimmed)) {
    return "invoice";
  }

  // Default: customer name search
  return "customer";
}

export function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount / 100); // Chargebee amounts are in cents
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getSubscriptionStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "#22c55e"; // green
    case "in_trial":
      return "#3b82f6"; // blue
    case "non_renewing":
      return "#f59e0b"; // amber
    case "cancelled":
    case "paused":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "#22c55e"; // green
    case "posted":
    case "payment_due":
      return "#f59e0b"; // amber
    case "not_paid":
      return "#ef4444"; // red
    case "voided":
      return "#6b7280"; // gray
    default:
      return "#6b7280"; // gray
  }
}

export function getCreditNoteStatusColor(status: string): string {
  switch (status) {
    case "refunded":
      return "#22c55e"; // green
    case "refund_due":
      return "#f59e0b"; // amber
    case "adjusted":
      return "#3b82f6"; // blue
    case "voided":
      return "#6b7280"; // gray
    default:
      return "#6b7280"; // gray
  }
}
