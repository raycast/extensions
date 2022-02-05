import { Task } from "@doist/todoist-api-typescript";
import { addDays, format, formatISO, isToday, isThisYear, isTomorrow, isBefore, compareAsc } from "date-fns";
import { partition } from "lodash";
import { priorities } from "./constants";

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

export function getSectionsWithDueDates(tasks: Task[]) {
  const [overdue, upcoming] = partitionTasksWithOverdue(tasks);

  const allDueDates = [...new Set(tasks.map((task) => task.due?.date))] as string[];
  allDueDates.sort((dateA, dateB) => compareAsc(new Date(dateA), new Date(dateB)));

  const sections = allDueDates.map((date) => ({
    name: displayDueDate(date),
    tasks: upcoming?.filter((task) => task.due?.date === date) || [],
  }));

  if (overdue.length > 0) {
    sections.unshift({
      name: "Overdue",
      tasks: overdue,
    });
  }

  return sections;
}

export function getSectionsWithPriorities(tasks: Task[]) {
  return priorities.map(({ name, value }) => ({
    name,
    tasks: tasks?.filter((task) => task.priority === value) || [],
  }));
}
