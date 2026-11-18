import type { Tool } from "@raycast/api";
import { updateReminder } from "swift:../../swift/AppleReminders";

import type { Frequency } from "../create-reminder";
import { getRecurrenceConfirmationInfo, normalizeReminderToolInput } from "../helpers/reminder-tools";

type Input = {
  /**
   * The ID of the reminder to update.
   */
  reminderId: string;
  /**
   * The ID of the list to move the reminder to.
   */
  listId?: string;
  /**
   * The new title of the reminder.
   */
  title?: string;
  /**
   * The new notes for the reminder.
   */
  notes?: string;
  /**
   * The new due date. Can either be a full day date (YYYY-MM-DD) or an ISO date if the time is specified (YYYY-MM-DDTHH:mm:ss.sssZ).
   */
  dueDate?: string;
  /**
   * The new priority of the reminder.
   */
  priority?: "high" | "medium" | "low";
  /**
   * The new tags for the reminder. A comma-separated or space-separated list of tags (e.g. "work, urgent" or "#work #urgent").
   */
  tags?: string;
  /**
   * Whether the reminder is completed.
   */
  isCompleted?: boolean;
  /**
   * The new URL / link attached to the reminder.
   */
  url?: string;
  /**
   * The recurrence settings.
   * Only include this when the user explicitly asks to add or change recurrence.
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
    message: "Apply recurrence changes to this reminder?",
    info: [
      { name: "Reminder ID", value: input.reminderId },
      ...getRecurrenceConfirmationInfo(input.recurrence, input.dueDate),
    ],
  };
};

export default async function (input: Input) {
  return updateReminder(normalizeReminderToolInput(input));
}
