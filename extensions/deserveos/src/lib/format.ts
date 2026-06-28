import { Color } from "@raycast/api";

export const formatMoney = (amountMicros?: number | null, currencyCode?: string | null): string | null => {
  if (amountMicros === undefined || amountMicros === null) return null;
  const amount = amountMicros / 1_000_000;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${currencyCode ?? ""}`.trim();
  }
};

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// Human due-date label relative to today, e.g. "Today", "Overdue · 3d", "in 2d".
export const formatDueDate = (dueAt?: string | null): { label: string; color: Color } => {
  if (!dueAt) return { label: "No due date", color: Color.SecondaryText };

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return { label: "No due date", color: Color.SecondaryText };

  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diffDays = Math.round((dueDay - today) / 86_400_000);

  if (diffDays < 0) return { label: `Overdue · ${Math.abs(diffDays)}d`, color: Color.Red };
  if (diffDays === 0) return { label: "Due today", color: Color.Orange };
  if (diffDays === 1) return { label: "Due tomorrow", color: Color.Yellow };
  if (diffDays <= 7) return { label: `In ${diffDays}d`, color: Color.Green };

  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    color: Color.SecondaryText,
  };
};

export const formatDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  SCREENING: "Screening",
  MEETING: "Meeting",
  PROPOSAL: "Proposal",
  CUSTOMER: "Client",
  LOST: "Lost",
  DEFERRED: "Deferred",
};

// Map the internal opportunity stage to the DeserveOS-facing label (CUSTOMER → Client).
export const formatStage = (stage?: string | null): string => {
  if (!stage) return "—";
  return STAGE_LABELS[stage] ?? stage;
};

export const stageColor = (stage?: string | null): Color => {
  switch (stage) {
    case "CUSTOMER":
      return Color.Green;
    case "LOST":
      return Color.Red;
    case "PROPOSAL":
      return Color.Orange;
    case "MEETING":
      return Color.Blue;
    case "DEFERRED":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
};
