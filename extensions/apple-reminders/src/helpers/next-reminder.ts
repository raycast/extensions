import { isFullDay } from "../helpers";
import type { Reminder } from "../hooks/useData";

/** Cache key shared by the menu bar and Next Reminder for the selected lists. */
export const MENU_BAR_LISTS_KEY = "menu-bar-lists";

/** Cache key of the single list the menu bar showed before several lists could be selected. */
export const LEGACY_MENU_BAR_LIST_KEY = "menu-bar-list";

/** Lists to show: "all", or the ids of the selected lists (empty when every list is unchecked). */
export type ListSelection = "all" | string[];

/** Cache key for reminders dismissed from the menu bar: reminder id → due date when dismissed. */
export const DISMISSED_KEY = "menu-bar-dismissed";

export type NextReminderMatch = {
  reminder: Reminder;
  due: Date;
  /** `upcoming` before the due time, `current` from the due time until it's hidden. */
  status: "upcoming" | "current";
};

export type NextReminderOptions = {
  /** Only reminders in these lists; defaults to all lists. */
  lists?: ListSelection;
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
 * Work out the selected lists from the cached values, falling back to the older single-list choice so
 * it applies before the menu bar has migrated it.
 *
 * @param stored - Cached value of {@link MENU_BAR_LISTS_KEY}.
 * @param legacyListId - Cached value of {@link LEGACY_MENU_BAR_LIST_KEY}.
 * @returns The list selection.
 */
export function resolveListSelection(stored: unknown, legacyListId: unknown): ListSelection {
  if (stored === "all") return "all";
  if (Array.isArray(stored) && stored.every((id) => typeof id === "string")) return stored;
  if (typeof legacyListId === "string" && legacyListId) return [legacyListId];
  return "all";
}

/**
 * Turn one list on or off. Turning a list on while all lists are shown selects only that list, and
 * turning off the last list leaves none selected.
 *
 * @param selection - Current selection.
 * @param listId - List to toggle, or undefined to show all lists.
 * @returns The new selection.
 */
export function toggleListSelection(selection: ListSelection, listId: string | undefined): ListSelection {
  if (listId === undefined) return "all";
  if (selection === "all") return [listId];
  return selection.includes(listId) ? selection.filter((id) => id !== listId) : [...selection, listId];
}

/**
 * Whether a list is part of the selection.
 *
 * @param selection - Current selection.
 * @param listId - List to check.
 * @returns True when the list is selected.
 */
export function isListSelected(selection: ListSelection, listId: string | undefined): boolean {
  if (selection === "all") return true;
  return listId !== undefined && selection.includes(listId);
}

/**
 * Whether the menu bar item should be hidden. "Only show for an upcoming reminder" applies only when
 * Upcoming Reminder is on, and never while no list is selected, so the Lists menu stays reachable.
 *
 * @param options - Preference and state.
 * @returns True to hide the menu bar item.
 */
export function shouldHideMenuBar(options: {
  hideWhenNothingDue: boolean;
  nextReminderEnabled: boolean;
  /** True until any reminders, cached or fresh, are available. */
  isLoading: boolean;
  hasNextReminder: boolean;
  lists: ListSelection;
}): boolean {
  if (!options.hideWhenNothingDue || !options.nextReminderEnabled || options.isLoading) return false;
  if (options.lists !== "all" && options.lists.length === 0) return false;
  return !options.hasNextReminder;
}

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
  const lists = options.lists ?? "all";
  const dismissed = options.dismissed ?? {};
  const timed = reminders
    .filter((reminder) => !reminder.isCompleted && reminder.dueDate && !isFullDay(reminder.dueDate))
    .filter((reminder) => dismissed[reminder.id] !== reminder.dueDate)
    .filter((reminder) => isListSelected(lists, reminder.list?.id))
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
