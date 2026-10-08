import { RefundKind, SaleStatus, SubscriptionStatus } from "../providers/types";

/** "just now", "3m ago", "2h ago", "4d ago". */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function updatedLabel(date: Date | undefined, now: Date = new Date()): string | undefined {
  return date ? `Updated ${relativeTime(date, now)}` : undefined;
}

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partially Refunded",
  disputed: "Disputed",
  pending: "Pending",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past Due",
  cancelled: "Cancelled",
  paused: "Paused",
};

export const REFUND_KIND_LABELS: Record<RefundKind, string> = {
  refund: "Refund",
  dispute: "Dispute",
  chargeback: "Chargeback",
};

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Section titles with a count, as stripe and datafast do ("Successful (12)"). */
export function sectionTitle(title: string, count: number): string {
  return `${title} (${count})`;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
