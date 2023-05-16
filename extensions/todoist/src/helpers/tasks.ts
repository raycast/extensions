import { Task } from "../api";

import { isExactTimeTask } from "./dates";

export function getTaskUrl(id: string) {
  return `https://todoist.com/app/task/${id}`;
}

export function getTaskAppUrl(id: string) {
  return `todoist://task?id=${id}`;
}

export function getTasksForTodayOrUpcomingView(tasks: Task[], userId: string) {
  const filteredTasks = tasks.filter((t) => {
    if (!t.due) {
      return false;
    }

    if (t.responsible_uid && t.responsible_uid !== userId) {
      return false;
    }

    return true;
  });

  // Sorts tasks based on the following criteria, in order:
  // 1. Due date type (datetime due dates appear first)
  // 2. Due date and time (earliest first)
  // 3. Priority (highest first)
  // 4. Day order (lowest first)
  return filteredTasks.sort((a, b) => {
    if (!a.due || !b.due) {
      return 0;
    }

    const aIsExactTime = isExactTimeTask(a);
    const bIsExactTime = isExactTimeTask(b);
    if (aIsExactTime !== bIsExactTime) {
      return bIsExactTime ? 1 : -1;
    }

    const bDue = new Date(b.due.date);
    const aDue = new Date(a.due.date);
    if (aDue.getTime() !== bDue.getTime()) {
      return aDue.getTime() - bDue.getTime();
    }

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return a.day_order - b.day_order;
  });
}
