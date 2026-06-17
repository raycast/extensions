import { Reminder } from "../types/reminder";

export function dateSortPredicate(a: Reminder, b: Reminder) {
  return Number(a.date) - Number(b.date);
}
