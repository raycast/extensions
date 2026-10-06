import { getPreferenceValues } from "@raycast/api";
import { resolveDefaultCalendar } from "../hooks/useCalendars";
import {
  getCachedCalendars,
  invalidateTaskCache,
  setCachedCalendars,
} from "../hooks/useTaskCache";
import { addDaysISO, getTodayISO } from "../utils/date-utils";
import { create_task, list_calendars } from "../utils/tweek-client";

type Input = {
  /**
   * Title of the task to create.
   */
  text: string;
  /**
   * Optional date in YYYY-MM-DD format, or relative string ("today", "tomorrow", "someday"). Defaults to today.
   */
  date?: string;
  /**
   * Optional calendar ID or name. Defaults to user's default calendar.
   */
  calendarId?: string;
  /**
   * Optional color badge ("blank", "pink", "yellowish", "cornflower", "mango", "greenish", "lilac", "grey", "black").
   */
  color?: string;
  /**
   * Optional Markdown note or details.
   */
  note?: string;
  /**
   * Optional comma-separated or newline-separated subtask titles to add as a checklist.
   */
  subtasks?: string;
};

/**
 * Creates a new task in Tweek.
 */
export default async function createTaskTool(input: Input) {
  const prefs = getPreferenceValues<Preferences>();

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
    throw new Error("No Tweek calendar available.");
  }

  const todayISO = getTodayISO();
  let resolvedDate: string | null = todayISO;
  let resolvedListId: string | null = null;

  if (input.date) {
    const raw = input.date.trim().toLowerCase();
    if (raw === "today") {
      resolvedDate = todayISO;
    } else if (raw === "tomorrow") {
      resolvedDate = addDaysISO(todayISO, 1);
    } else if (raw === "someday") {
      resolvedDate = null;
      resolvedListId = targetCal.lists?.[0]?.id || null;
    } else {
      resolvedDate = input.date.trim();
    }
  }

  const subtaskItems = input.subtasks
    ? input.subtasks
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s, idx) => ({
          id: `ai_sub_${Date.now()}_${idx}`,
          text: s,
          done: false,
        }))
    : undefined;

  const created = await create_task({
    calendarId: targetCal.id,
    text: input.text,
    date: resolvedListId ? null : resolvedDate,
    listId: resolvedListId,
    color: input.color || prefs.defaultTaskColor || "blank",
    note: input.note,
    checklist: subtaskItems,
  });

  invalidateTaskCache(targetCal.id);

  return {
    success: true,
    taskId: created.id,
    text: input.text,
    calendar: targetCal.name,
    date: resolvedDate || "Someday",
    color: input.color || prefs.defaultTaskColor || "blank",
  };
}
