import { create } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";
import { Priority, ReminderChannel } from "../lib/types";

type Input = {
  /** The todo title — a single line of plain text. Required. */
  title: string;
  /** The first date of the routine, ISO "YYYY-MM-DD" or a datetime with offset. Required. */
  when: string;
  /** Repeat unit. Required. */
  repeat: "day" | "week" | "month" | "year";
  /** Interval, e.g. repeat "week" + every 2 = biweekly. Default 1. */
  every?: number;
  /** Weekly repeat days, e.g. "mon,wed,fri" or "1,3,5". */
  weekdays?: string;
  /** Monthly/yearly repeat day of month (1-31). */
  dayOfMonth?: number;
  /** Yearly repeat month (1-12). */
  monthOfYear?: number;
  /** Optional end date for the routine, YYYY-MM-DD. */
  until?: string;
  /** Priority: none | low | medium | high. */
  priority?: Priority;
  /** A free-text grouping label, e.g. "work". */
  category?: string;
  /** Longer description, single line. */
  description?: string;
  /** Subtasks — each string becomes one step. */
  subtasks?: string[];
  /** Reminder times as ISO datetimes with offset; each at or before the occurrence time. */
  reminders?: string[];
  /** Reminder delivery channels. Use ["voice_call"] for phone call reminders. */
  reminderChannels?: ReminderChannel[];
  /** Convenience flag: set true to make the reminder a phone call reminder. */
  phoneReminder?: boolean;
};

/**
 * Create a RECURRING (repeating) Jovida todo — a routine that recurs on a
 * schedule. Use this ONLY when the user EXPLICITLY asks for repetition
 * ("every day", "each Monday", "weekly", "每天/每周/每月"). Do NOT use it for a
 * one-off task that merely has a date or a reminder — use create-todo for those.
 *
 * Returns the new recurring_id.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  return create(input);
}
