import { Task } from "../api";

import { sortByDate } from "./sortBy";

export function getFilterUrl(id: string) {
  return `https://todoist.com/app/filter/${id}`;
}

export function getFilterAppUrl(id: string) {
  return `todoist://filter?id=${id}`;
}

export function filterSort(tasks: Task[]) {
  tasks.sort((a, b) => {
    // Sort by priority (highest first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // Sort by date
    return sortByDate(a, b);
  });

  return tasks;
}
