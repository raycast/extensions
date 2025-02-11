import { Reminder } from "../api";

import { DisplayDateTime } from "./dates";

export function displayReminderName(reminder: Reminder) {
  if (reminder.type === "location" && reminder.name) {
    return `${reminder.loc_trigger === "on_enter" ? "Arriving: " : "Departing: "}${reminder.name}`;
  }

  if (reminder.due?.date) {
    return DisplayDateTime(reminder.due.date);
  }

  return "Unknown reminder";
}
