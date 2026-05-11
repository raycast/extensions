import { parseISO } from "date-fns";

import { Task } from "../api";

import { isExactTimeTask } from "./dates";

export const searchBarPlaceholder = "Filter tasks by name, priority, project, label or assignee";

export enum ViewMode {
  project = "project",
  date = "date",
  search = "search",
}

export function getTaskUrl(id: string) {
  return `https://todoist.com/app/task/${id}`;
}

export function getTaskAppUrl(id: string) {
  return `todoist://task?id=${id}`;
}

export function getTasksForUpcomingView(tasks: Task[], userId: string) {
  const filteredTasks = tasks.filter((t) => {
    if (!t.due && !t.deadline) {
      return false;
    }

    if (t.responsible_uid && t.responsible_uid !== userId) {
      return false;
    }

    return true;
  });

  // Sorts tasks based on the following criteria, in order:
  // 1. Tasks with time components first, sorted by earliest time
  // 2. Tasks without time components, sorted by earliest date
  // 3. Priority (highest first)
  // 4. Deadline (earliest first)
  // 5. Day order (lowest first)
  return filteredTasks.sort((a, b) => {
    // Check if tasks have time components
    const aHasTime = a.due ? isExactTimeTask(a) : false;
    const bHasTime = b.due ? isExactTimeTask(b) : false;

    // If one task has time and the other doesn't, prioritize the one with time
    if (aHasTime !== bHasTime) {
      return aHasTime ? -1 : 1;
    }

    // If both tasks have due dates with time components, compare them
    if (aHasTime && bHasTime && a.due && b.due) {
      const aDue = new Date(a.due.date);
      const bDue = new Date(b.due.date);

      if (aDue.getTime() !== bDue.getTime()) {
        return aDue.getTime() - bDue.getTime();
      }
    }
    // If both tasks have due dates without time components, compare them
    else if (!aHasTime && !bHasTime && a.due && b.due) {
      const aDue = new Date(a.due.date);
      const bDue = new Date(b.due.date);

      if (aDue.getTime() !== bDue.getTime()) {
        return aDue.getTime() - bDue.getTime();
      }
    }
    // If only one task has a due date, prioritize it
    else if (a.due && !b.due) {
      return -1;
    } else if (!a.due && b.due) {
      return 1;
    }

    // Then compare priorities
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // Then compare deadlines
    if (a.deadline && b.deadline) {
      const aDeadline = new Date(a.deadline.date);
      const bDeadline = new Date(b.deadline.date);

      if (aDeadline.getTime() !== bDeadline.getTime()) {
        return aDeadline.getTime() - bDeadline.getTime();
      }
    }
    // If only one task has a deadline, prioritize it
    else if (a.deadline && !b.deadline) {
      return -1;
    } else if (!a.deadline && b.deadline) {
      return 1;
    }

    // Finally, compare day order
    return a.day_order - b.day_order;
  });
}

export function getTasksForTodayView(tasks: Task[], userId: string) {
  return getTasksForUpcomingView(tasks, userId).filter((t) => {
    if (!t.due) return false;

    // Parse the task's due date
    const taskDate = parseISO(t.due.date);

    // Get today's date at midnight in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the task's due date at midnight in local timezone
    const taskDateMidnight = new Date(taskDate);
    taskDateMidnight.setHours(0, 0, 0, 0);

    // Only show tasks due today or overdue
    return taskDateMidnight <= today;
  });
}
