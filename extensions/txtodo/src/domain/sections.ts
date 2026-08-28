import { parseDueDate, startOfDay } from "./due";
import type { Task } from "./parser";
import { groupByPriority, PRIORITY_KEYS, sortGroup } from "./sort";

export type DateSections = {
  overdue: Task[];
  today: Task[];
  upNext: Task[];
  unscheduled: Task[];
};

export function sectionsByDate(active: Task[], now: Date): DateSections {
  const todayStart = startOfDay(now).getTime();

  const overdue: Task[] = [];
  const today: Task[] = [];
  const upNext: Task[] = [];
  const unscheduled: Task[] = [];

  for (const task of active) {
    const due = parseDueDate(task.metadata.due);
    if (!due) {
      unscheduled.push(task);
      continue;
    }
    const dueStart = startOfDay(due).getTime();
    if (dueStart < todayStart) {
      overdue.push(task);
    } else if (dueStart === todayStart) {
      today.push(task);
    } else {
      upNext.push(task);
    }
  }

  return {
    overdue: sortByPriorityThenDue(overdue),
    today: sortByPriorityThenDue(today),
    upNext: sortByPriorityThenDue(upNext),
    unscheduled: sortByPriorityThenDue(unscheduled),
  };
}

function sortByPriorityThenDue(tasks: Task[]): Task[] {
  const groups = groupByPriority(tasks);
  const out: Task[] = [];
  for (const key of PRIORITY_KEYS) {
    const bucket = groups.get(key);
    if (!bucket) continue;
    for (const t of sortGroup(bucket)) {
      out.push(t);
    }
  }
  return out;
}
