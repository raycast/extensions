import { Subscription } from "./graphql";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getPaymentDateInMonth(sub: Subscription, year: number, month: number): Date | null {
  const { startDate, paymentCycle } = sub;

  // Don't show for months before the subscription started
  if (year < startDate.year || (year === startDate.year && month < startDate.month)) {
    return null;
  }

  if (paymentCycle === "monthly") {
    const day = Math.min(startDate.date, daysInMonth(year, month));
    return new Date(year, month - 1, day);
  }

  if (paymentCycle === "quarterly") {
    const monthsSinceStart = (year - startDate.year) * 12 + (month - startDate.month);
    if (monthsSinceStart % 3 !== 0) return null;
    const day = Math.min(startDate.date, daysInMonth(year, month));
    return new Date(year, month - 1, day);
  }

  if (paymentCycle === "yearly") {
    if (startDate.month !== month) return null;
    const day = Math.min(startDate.date, daysInMonth(year, month));
    return new Date(year, month - 1, day);
  }

  return null;
}

export function getSubscriptionsForMonth(
  subscriptions: Subscription[],
  year: number,
  month: number,
): Array<{ subscription: Subscription; paymentDate: Date }> {
  return subscriptions
    .map((sub) => ({ subscription: sub, paymentDate: getPaymentDateInMonth(sub, year, month) }))
    .filter((item): item is { subscription: Subscription; paymentDate: Date } => item.paymentDate !== null)
    .sort((a, b) => a.paymentDate.getDate() - b.paymentDate.getDate());
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

export function monthValueToLabel(value: string): string {
  const [yearStr, monthStr] = value.split("-");
  return new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function stepMonth(value: string, delta: number): string {
  const [yearStr, monthStr] = value.split("-");
  const d = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
