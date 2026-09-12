import { Reminder } from "../api";

import { displayDateTime } from "./dates";

/** Todoist 'at time of task' relative reminder (`minute_offset: 0` in API calls; sync stores `mm_offset`). */
export function hasAtTaskTimeRelativeReminder(reminders: Reminder[] | undefined, itemId: string) {
  return !!reminders?.some(
    (r) => r.item_id === itemId && r.is_deleted !== 1 && r.type === "relative" && (r.mm_offset ?? 0) === 0,
  );
}

export function displayReminderName(reminder: Reminder, use12HourFormat: boolean) {
  if (reminder.type === "location" && reminder.name) {
    return `${reminder.loc_trigger === "on_enter" ? "Arriving: " : "Departing: "}${reminder.name}`;
  }

  if (reminder.due?.date) {
    return displayDateTime(reminder.due.date, use12HourFormat);
  }

  return "Unknown reminder";
}
