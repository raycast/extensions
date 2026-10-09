import { isFullDay } from "../helpers";
import type { Reminder } from "../hooks/useData";

/** Cache key shared by the menu bar and Next Reminder for the selected lists (empty = all lists). */
export const MENU_BAR_LISTS_KEY = "menu-bar-lists";

/** Cache key for reminders dismissed from the menu bar: reminder id → due date when dismissed. */
export const DISMISSED_KEY = "menu-bar-dismissed";

export type NextReminderMatch = {
  reminder: Reminder;
  due: Date;
  /** `upcoming` before the due time, `current` from the due time until it's hidden. */
  status: "upcoming" | "current";
};

export type NextReminderOptions = {
  /** Only reminders in these lists; empty means every list. */
  listIds?: string[];
  /** Show a reminder this many minutes before it's due; `null` always shows the next one. */
  showBeforeMinutes: number | null;
  /**
   * Keep showing a reminder this many minutes after it's due; `null` keeps it until it's completed
   * or its due day ends, so an unfinished reminder from an earlier day never takes over.
   */
  hideAfterMinutes: number | null;
  /** Reminders dismissed from the menu bar (id → due date at dismissal); they show again if rescheduled. */
  dismissed?: Record<string, string>;
};

/**
 * Parse a "minutes" preference value such as "15", "always" or "completed".
 *
 * @param value - Preference value.
 * @returns Minutes, or null for "always" / "completed".
 */
export function parseMinutesPreference(value: string | undefined, fallback: number | null): number | null {
  if (value === undefined || value === "") return fallback;
  if (value === "always" || value === "completed") return null;
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : fallback;
}

/**
 * Pick the reminder to show, the way Raycast's Calendar picks an event: one that's due now (until it
 * is hidden), otherwise the next timed reminder inside the window. All-day reminders have no time and
 * are skipped.
 *
 * @param reminders - Reminders to consider.
 * @param now - Current time.
 * @param options - List filter and time window.
 * @returns The reminder and its due time, or undefined when nothing is in the window.
 */
export function findNextReminder(
  reminders: Reminder[],
  now: Date,
  options: NextReminderOptions,
): NextReminderMatch | undefined {
  const listIds = options.listIds ?? [];
  const dismissed = options.dismissed ?? {};
  const timed = reminders
    .filter((reminder) => !reminder.isCompleted && reminder.dueDate && !isFullDay(reminder.dueDate))
    .filter((reminder) => dismissed[reminder.id] !== reminder.dueDate)
    .filter((reminder) => listIds.length === 0 || (reminder.list && listIds.includes(reminder.list.id)))
    .map((reminder) => ({ reminder, due: new Date(reminder.dueDate as string) }))
    .filter(({ due }) => !isNaN(due.getTime()));

  const t = now.getTime();
  const current = timed
    .filter(({ due }) => {
      if (due.getTime() > t) return false;
      if (options.hideAfterMinutes !== null) return t < due.getTime() + options.hideAfterMinutes * 60_000;
      const endOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1).getTime();
      return t < endOfDueDay;
    })
    .sort((a, b) => b.due.getTime() - a.due.getTime())[0];
  if (current) return { ...current, status: "current" };

  const upcoming = timed.filter(({ due }) => due.getTime() > t).sort((a, b) => a.due.getTime() - b.due.getTime())[0];
  if (!upcoming) return undefined;
  if (options.showBeforeMinutes !== null && upcoming.due.getTime() - t > options.showBeforeMinutes * 60_000) {
    return undefined;
  }
  return { ...upcoming, status: "upcoming" };
}

/**
 * Relative time such as "in 8m", "in 1h 05m", "now" or "5m ago".
 *
 * @param due - Due time.
 * @param now - Current time.
 * @returns Short relative time.
 */
export function formatRelativeDue(due: Date, now: Date): string {
  const diff = due.getTime() - now.getTime();
  const minutes = Math.round(Math.abs(diff) / 60_000);
  if (minutes < 1) return "now";
  const span = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  return diff > 0 ? `in ${span}` : `${span} ago`;
}

/**
 * Keep only dismissals that still apply: the reminder exists, is open, and has the same due date.
 *
 * @param dismissed - Dismissed reminders.
 * @param reminders - Current reminders.
 * @returns Pruned dismissals.
 */
export function pruneDismissed(dismissed: Record<string, string>, reminders: Reminder[]): Record<string, string> {
  const open = new Map(reminders.filter((r) => !r.isCompleted).map((r) => [r.id, r.dueDate]));
  return Object.fromEntries(Object.entries(dismissed).filter(([id, due]) => open.get(id) === due));
}
