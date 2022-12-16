import { Label, Task } from "@doist/todoist-api-typescript";
import { compareAsc } from "date-fns";
import { partition } from "lodash";
import { priorities } from "../constants";
import { displayDueDate, isOverdue } from "./dates";

export function partitionTasksWithOverdue(tasks: Task[]) {
  return partition(tasks, (task: Task) => task.due?.date && isOverdue(new Date(task.due.date)));
}

export function getSectionsWithDueDates(tasks: Task[]) {
  const [overdue, upcoming] = partitionTasksWithOverdue(tasks);

  const allDueDates = [...new Set(upcoming.map((task) => task.due?.date))] as string[];
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
  const tasksWithoutLabels = tasks?.filter((task) => task.labels.length === 0);

  const sections =
    labels?.map((label) => {
      return {
        name: label.name,
        tasks: tasks?.filter((task) => task.labels.includes(label.id)) || [],
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
