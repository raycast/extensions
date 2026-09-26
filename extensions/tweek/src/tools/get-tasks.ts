import { getPreferenceValues } from "@raycast/api";
import { resolveDefaultCalendar } from "../hooks/useCalendars";
import { getCachedCalendars, setCachedCalendars } from "../hooks/useTaskCache";
import { ExtensionPreferences, TweekTask } from "../types";
import {
  addDaysISO,
  getDashboardFetchWindowISO,
  getTodayISO,
  getWeekBoundsISO,
  isOverdue,
} from "../utils/date-utils";
import { list_calendars, list_tasks } from "../utils/tweek-client";

export type GetTasksInput = {
  /**
   * Optional calendarId or calendar name. If omitted, uses the user's default calendar.
   */
  calendarId?: string;
  /**
   * Optional preset filter: "today", "this_week", "overdue", "someday", or "all".
   */
  preset?: "today" | "this_week" | "overdue" | "someday" | "all";
  /**
   * Optional start date in YYYY-MM-DD format.
   */
  dateFrom?: string;
  /**
   * Optional end date in YYYY-MM-DD format.
   */
  dateTo?: string;
  /**
   * Optional search keyword to filter tasks by title, note, or subtask text.
   */
  searchQuery?: string;
  /**
   * Whether to exclude completed tasks (defaults to false).
   */
  onlyPending?: boolean;
};

/**
 * Fetches Tweek tasks for a calendar, date preset (today, this_week, overdue, someday), or search query.
 */
export default async function getTasksTool(input: GetTasksInput = {}) {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  let calendars = getCachedCalendars(true);
  if (!calendars || calendars.length === 0) {
    calendars = await list_calendars();
    setCachedCalendars(calendars);
  }

  const targetCal =
    resolveDefaultCalendar(
      calendars,
      input.calendarId || prefs.defaultCalendar,
    ) || calendars[0];

  if (!targetCal) {
    return { error: "No Tweek calendars found.", tasks: [] };
  }

  const todayISO = getTodayISO();
  let dateFrom = input.dateFrom;
  let dateTo = input.dateTo;

  if (!dateFrom && !dateTo) {
    if (input.preset === "today") {
      dateFrom = todayISO;
      dateTo = todayISO;
    } else if (input.preset === "this_week") {
      const bounds = getWeekBoundsISO(
        new Date(),
        prefs.weekStartsOn || "Monday",
      );
      dateFrom = bounds.startISO;
      dateTo = bounds.endISO;
    } else if (input.preset === "overdue") {
      dateFrom = addDaysISO(todayISO, -30);
      dateTo = addDaysISO(todayISO, -1);
    } else {
      const win = getDashboardFetchWindowISO();
      dateFrom = win.dateFrom;
      dateTo = win.dateTo;
    }
  }

  let tasks: TweekTask[] = [];

  if (input.preset === "someday") {
    const listResults = await Promise.all(
      (targetCal.lists || []).map((l) =>
        list_tasks({
          calendarId: targetCal.id,
          listId: l.id,
          expand: false,
        }).catch(() => ({ data: [] as TweekTask[] })),
      ),
    );
    tasks = listResults.flatMap((r) => r.data);
  } else {
    const dated = await list_tasks({
      calendarId: targetCal.id,
      dateFrom,
      dateTo,
      expand: true,
    });
    tasks = dated.data;
  }

  if (input.preset === "overdue") {
    tasks = tasks.filter((t) => isOverdue(t.date, t.done));
  }

  if (input.onlyPending) {
    tasks = tasks.filter((t) => !t.done);
  }

  if (input.searchQuery && input.searchQuery.trim()) {
    const q = input.searchQuery.trim().toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.text.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q)) ||
        t.checklist?.some((item) => item.text.toLowerCase().includes(q)),
    );
  }

  return {
    todayISO,
    calendar: { id: targetCal.id, name: targetCal.name },
    totalCount: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      date: t.date,
      listId: t.listId || null,
      color: t.color || "blank",
      note: t.note || null,
      virtual: Boolean(t.virtual),
      checklist: t.checklist || [],
    })),
  };
}
