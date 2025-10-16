import { Reminder } from "../types/reminder";

export function getNextReminder(reminders: Reminder[]): Reminder | undefined {
  return reminders.find((reminder) => reminder.date.getTime() > new Date().getTime());
}
