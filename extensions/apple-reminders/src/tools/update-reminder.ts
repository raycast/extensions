import { updateReminder } from "swift:../../swift/AppleReminders";

import { Frequency } from "../create-reminder";

type Input = {
  /**
   * The ID of the reminder to update.
   */
  reminderId: string;
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
   * Whether the reminder is completed.
   */
  isCompleted?: boolean;
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

  const reminder = await updateReminder(input);
  return reminder;
}
