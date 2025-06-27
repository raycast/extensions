import moment from "moment";
import { Task } from "./types";

// date.ts
export enum Priority {
  High,
  Medium,
  Low,
  Default,
}

export function determinePriority(date: string): Priority {
  const now = moment().startOf("day");
  const targetDate = moment(date).startOf("day");

  if (targetDate.isBefore(now)) {
    return Priority.High;
  }

  const daysDifference = targetDate.diff(now, "days");

  if (daysDifference === 0) {
    return Priority.Medium;
  } else if (daysDifference === 1) {
    return Priority.Low;
  }

  return Priority.Default;
}

export function sortByDate(a: Task, b: Task) {
  if (a.date && b.date) {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  } else if (a.date) {
    return -1;
  } else if (b.date) {
    return 1;
  } else {
    return 0;
  }
}

export function sortByLevel(a: Task, b: Task) {
  const difficultyOrder = ["Trivial", "Medium", "Hard"];

  const aIndex = difficultyOrder.indexOf(a.difficulty);
  const bIndex = difficultyOrder.indexOf(b.difficulty);

  return aIndex - bIndex;
}

export function isPastDue(taskDueDate?: string) {
  if (!taskDueDate) return false;
  return moment(taskDueDate).startOf("day").isBefore(moment().startOf("day"));
}
