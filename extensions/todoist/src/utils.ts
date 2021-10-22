import { Task } from "./types";
import { addDays, format, formatISO, isToday, isThisYear, isTomorrow, isBefore } from "date-fns";

export function isRecurring(task: Task): boolean {
  return task.due?.recurring || false;
}

export function displayDueDate(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  const nextWeek = addDays(new Date(), 7);
  if (isBefore(date, nextWeek)) {
    return format(date, "eeee");
  }

  if (isThisYear(date)) {
    return format(date, "dd MMMM");
  }

  return format(date, "dd MMMM yyy");
}

export function getAPIDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}
