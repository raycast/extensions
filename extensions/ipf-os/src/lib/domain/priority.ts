import type { TicketPriority } from "./enums";

export const SLA_WINDOW_MINUTES: Record<TicketPriority, number> = {
  CRITICAL: 240,
  HIGH: 1440,
  MEDIUM: 4320,
  NORMAL: 10080,
};

const MINUTE_MS = 60_000;

export function derivePriority(dueDate: Date | null | undefined, reference = new Date()): TicketPriority {
  if (!dueDate) return "NORMAL";

  const leadMinutes = (dueDate.getTime() - reference.getTime()) / MINUTE_MS;

  if (leadMinutes <= SLA_WINDOW_MINUTES.CRITICAL) return "CRITICAL";
  if (leadMinutes <= SLA_WINDOW_MINUTES.HIGH) return "HIGH";
  if (leadMinutes <= SLA_WINDOW_MINUTES.MEDIUM) return "MEDIUM";
  return "NORMAL";
}

export const isPastDue = (dueDate: Date | null | undefined, reference = new Date()): boolean =>
  Boolean(dueDate) && (dueDate as Date).getTime() <= reference.getTime();
