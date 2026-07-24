import { Tool } from "@raycast/api";
import { createReminder } from "swift:../../swift/AppleReminders";

import { Frequency } from "../create-reminder";

type Input = {
  /**
   * The title of the reminder.
   */
  title: string;
  /**
   * The notes for the reminder.
   */
  notes?: string;
  /**
   * Optional due date. Only include this when the user explicitly asks for a date, day, time, or schedule, such as "today", "tomorrow", "tonight", "this weekend", "next week", "in 3 days", "end of day", or an explicit clock time. Omit this for title-only, Inbox, Backlog, or generic capture reminders. Must include a calendar date when present. Use YYYY-MM-DD for full-day reminders or ISO with time (YYYY-MM-DDTHH:mm:ss.sssZ). Time-only values (e.g. "10:00:00") are invalid and will fail. When the user mentions a time-of-day word with a date or day, use sensible defaults for that timeframe (e.g "8am" for "morning", "1pm" for "afternoon", "6pm" for "evening"). A number with "a" or "p" appended (e.g. "1p" or "8a") should be treated as AM or PM. If the user includes a date but didn't include a specific time, assume it's a full day reminder.
   */
  dueDate?: string;
  /**
   * Optional priority level. Only include this when the user explicitly asks for a priority or uses wording such as "urgent", "important", or an exclamation mark. Never default unspecified reminders to "low". Only pick the value from this list: "low", "medium", "high".
   */
  priority?: string;
  /**
   * The list ID to add the reminder to. Note that the user can prepend the "#" or "@" symbols to list names, for example, "#work" or "@work".
   */
  listId?: string;
  /**
   * The address for location-based reminders.
   */
  address?: string;
  /**
   * The proximity trigger type. Only pick the value from this list: "enter", "leave".
   */
  proximity?: "enter" | "leave";
  /**
   * The radius around the location in meters.
   */
  radius?: number;
  /**
   * The recurrence settings.
   * Only include this when the user explicitly asks for a repeating reminder (for example: "every day", "weekly", "monthly", "yearly", "weekdays", or "weekends").
   * Omit this for normal one-off reminders, including title-only, Inbox, Backlog, or generic capture reminders.
   */
  recurrence?: {
    /**
     * Recurrence frequency. Only pick the value from this list: "daily", "weekdays", "weekends", "weekly", "monthly", "yearly".
     */
    frequency: Frequency;
    /**
     * Recurrence interval. An integer greater than 0 that specifies how often a pattern repeats. If a recurrence frequency is "weekly" rule and the interval is 1, then the pattern repeats every week. If a recurrence frequency is "monthly" rule and the interval is 3, then the pattern repeats every 3 months.
     */
    interval: number;
    /**
     * Recurrence end date. A full day date (YYYY-MM-DD). If no end date is specified, the recurrence will repeat forever.
     */
    endDate?: string;
  };
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.recurrence) {
    return undefined;
  }

  return {
    message: `Create a recurring reminder for "${input.title}"?`,
    info: [
      { name: "Frequency", value: input.recurrence.frequency },
      { name: "Interval", value: String(input.recurrence.interval) },
      { name: "Due Date", value: input.dueDate },
      { name: "Recurrence End Date", value: input.recurrence.endDate },
    ],
  };
};

export default async function (input: Input) {
  if (input.dueDate && input.dueDate.includes("T")) {
    input.dueDate = new Date(input.dueDate).toISOString();
  }

  const reminder = await createReminder(input);
  return reminder;
}
