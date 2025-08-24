import { Reminder } from "../types/reminder";

export function hasFrequencyPredicate(reminder: Reminder) {
  return !!reminder.frequency;
}

export function hasNoFrequencyPredicate(reminder: Reminder) {
  return !reminder.frequency;
}
