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
   * The due date. Can either be a full day date (YYYY-MM-DD) or an ISO date if the time is specified (YYYY-MM-DDTHH:mm:ss.sssZ). Use sensible defaults for common timeframes (e.g "8am" for "morning", "1pm" for "afternoon", "6pm" for "evening"). A number with "a" or "p" appended (e.g. "1p" or "8a") should be treated as AM or PM. If the user didn't include a specific time, assume it's a full day reminder.
   */
  dueDate?: string;
  /**
   * The priority level. Only pick the value from this list: "low", "medium", "high". Use the "high" priority if the task text specifies a word such as "urgent", "important", or an exclamation mark.
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
   */
  recurrence?: {
    /**
     * Recurrence frequency. Only pick the value from this list: "daily", "weekly", "monthly", "yearly".
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

export default async function (input: Input) {
  if (input.dueDate && input.dueDate.includes("T")) {
    input.dueDate = new Date(input.dueDate).toISOString();
  }

  const reminder = await createReminder(input);
  return reminder;
}
