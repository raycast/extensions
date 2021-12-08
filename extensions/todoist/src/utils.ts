import { showToast, ToastStyle } from "@raycast/api";
import { AxiosError } from "axios";
import { addDays, format, formatISO, isToday, isThisYear, isTomorrow, isBefore } from "date-fns";
import { partition } from "lodash";
import { Task } from "./types";

export function isRecurring(task: Task): boolean {
  return task.due?.recurring || false;
}

export function displayDueDate(dateString: string): string {
  const date = new Date(dateString);

  if (isBeforeToday(date)) {
    return isThisYear(date) ? format(date, "dd MMMM") : format(date, "dd MMMM yyy");
  }

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

export function isBeforeToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(date, today);
}

export function partitionTasksWithOverdue(tasks: Task[]) {
  return partition(tasks, (task: Task) => task.due?.date && isBeforeToday(new Date(task.due.date)));
}

export async function showApiToastError({
  error,
  title,
  message,
}: {
  error: AxiosError;
  title: string;
  message: string;
}) {
  if (error.response?.status === 401 || error.response?.status === 403) {
    await showToast(ToastStyle.Failure, "Unauthorized", "Please check your Todoist token");
    return;
  }

  await showToast(ToastStyle.Failure, title, message);
}
