import { addDays, formatISO, isBefore, isSameDay } from "date-fns";
import { Priority } from "../hooks/useReminders";

export function isFullDay(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function getTodayInLocalTime() {
  return formatISO(new Date(), { representation: "date" });
}

export function isOverdue(date: string) {
  return isBefore(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isToday(date: string) {
  return isSameDay(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isTomorrow(date: string) {
  const today = isFullDay(date) ? getTodayInLocalTime() : new Date();
  return isSameDay(date, addDays(today, 1));
}

export function addPriorityToTitle(title: string, priority: Priority) {
  switch (priority) {
    case "high":
      return `!!! ${title}`;
    case "medium":
      return `!! ${title}`;
    case "low":
      return `! ${title}`;
    default:
      return title;
  }
}
