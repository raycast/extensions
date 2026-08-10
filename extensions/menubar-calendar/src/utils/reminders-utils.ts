import { addDays, formatISO, isBefore, isSameDay } from "date-fns";
import { Priority, Reminder } from "../hooks/useReminders";
import { formatDateWithCustomFormat } from "./common-utils";
import { getEventUrl } from "./calendar-events-utils";

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

export function buildReminderToolTip(event: Reminder) {
  const recurringIcon = event.isRecurring ? " ♺" : "";
  const list = event.list ? "\n" + "· " + event.list.title : "";
  const dueDate = event.dueDate ? "\n" + "· " + getLocalTime(event.dueDate) : "";
  const eventUrl = getEventUrl(event);
  const url = eventUrl ? "\n" + "· " + eventUrl : "";
  const notes = event.notes ? "\n" + "· " + event.notes : "";
  return "· " + event.title + recurringIcon + list + dueDate + url + notes;
}

export function getLocalTime(isoString: string | null | undefined) {
  if (!isoString) {
    return "";
  }
  const date = new Date(isoString);
  return formatDateWithCustomFormat(date) + " " + date.toLocaleTimeString();
}
