import { Label, Task } from "@doist/todoist-api-typescript";
import { addDays, format, formatISO, isThisYear, isBefore, compareAsc, isSameDay } from "date-fns";
import { partition } from "lodash";
import { priorities } from "./constants";

export function isRecurring(task: Task): boolean {
  return task.due?.recurring || false;
}

export function isExactTimeTask(task: Task): boolean {
  return !!task.due?.datetime;
}

/**
 * Returns today's date in user's timezone using the following format: YYYY-MM-DD
 *
 * Note that `format` from date-fns returns the date formatted to local time.
 * If it's 20th February at 6 AM UTC:
 * - This function will return 19th February at midnight UTC for Los Angeles timezone (GMT-8)
 * - This function will return 20th February at midnight UTC for Paris timezone (GMT+1)
 */
export function getToday() {
  return new Date(format(Date.now(), "yyyy-MM-dd"));
}

function isOverdue(date: Date) {
  return isBefore(date, getToday());
}

export function displayDueDate(dateString: string): string {
  const date = new Date(dateString);

  if (isOverdue(date)) {
    return isThisYear(date) ? format(date, "dd MMMM") : format(date, "dd MMMM yyy");
  }

  const today = getToday();

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, addDays(today, 1))) {
    return "Tomorrow";
  }

  const nextWeek = addDays(today, 7);

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

export function partitionTasksWithOverdue(tasks: Task[]) {
  return partition(tasks, (task: Task) => task.due?.date && isOverdue(new Date(task.due.date)));
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

export function getSectionsWithLabels({ tasks, labels }: { tasks: Task[]; labels: Label[] }) {
  const tasksWithoutLabels = tasks?.filter((task) => task.labelIds.length === 0);

  const sections =
    labels?.map((label) => {
      return {
        name: label.name,
        tasks: tasks?.filter((task) => task.labelIds.includes(label.id)) || [],
      };
    }) || [];

  if (tasksWithoutLabels) {
    sections.push({
      name: "No label",
      tasks: tasksWithoutLabels,
    });
  }

  return sections;
}
