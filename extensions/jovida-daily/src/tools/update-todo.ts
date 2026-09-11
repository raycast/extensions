import { update } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";
import { Priority, ReminderChannel } from "../lib/types";

type Input = {
  /**
   * The entry_id of the todo to change (or a recurring_id / occurrence id).
   * Get it from get-todos first — never guess it.
   */
  entryId: string;
  /** New title. */
  title?: string;
  /** New due date/time. Bare date = that day; datetime with offset = deadline. */
  when?: string;
  /** New priority: none | low | medium | high. */
  priority?: Priority;
  /** New category. */
  category?: string;
  /** New description. */
  description?: string;
  /** Replace the entire subtask list with these. */
  subtasks?: string[];
  /** Replace the entire reminder list with these ISO datetimes. */
  reminders?: string[];
  /** Replace reminder delivery channels. Use ["voice_call"] for phone call reminders. */
  reminderChannels?: ReminderChannel[];
  /** Add/remove the phone call channel for the current reminder. */
  phoneReminder?: boolean;
  /** Change repeat unit (recurring todos). */
  repeat?: "day" | "week" | "month" | "year";
  /** Change repeat interval. */
  every?: number;
  /** Change weekly repeat days, e.g. "mon,fri". */
  weekdays?: string;
  /** Change monthly/yearly day of month. */
  dayOfMonth?: number;
  /** Change yearly month. */
  monthOfYear?: number;
  /** Set/Change the repeat end date, YYYY-MM-DD. */
  until?: string;
  /** Remove the due date (also drops reminders). */
  clearWhen?: boolean;
  /** Remove all reminders. */
  clearRemind?: boolean;
  /** Remove the category. */
  clearCategory?: boolean;
  /** Remove the description. */
  clearDesc?: boolean;
  /** Remove all subtasks. */
  clearSubtasks?: boolean;
  /** Remove the repeat end date (make it endless). */
  clearUntil?: boolean;
};

/**
 * Change fields of an existing Jovida todo. Only the fields you pass change;
 * passing `subtasks`, `reminders`, or `reminderChannels` REPLACES the whole
 * list. Use `phoneReminder` to toggle only the phone call channel. Use the
 * clear* flags to unset a field. Applies immediately. Get the entry_id from
 * get-todos first.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  const { entryId, ...fields } = input;
  return update(entryId, fields);
}
