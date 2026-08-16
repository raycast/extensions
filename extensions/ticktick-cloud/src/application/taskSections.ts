import type { Task } from "../domain/task";
import { getLocalDay, getTaskDateInterval, intervalIntersectsDay } from "./taskDates";
import type { SelectionContext, TaskSection } from "./viewQuery";

export function selectToday(tasks: Task[], context: SelectionContext): TaskSection[] {
  const day = getLocalDay(context, 0);
  const overdue: Task[] = [];
  const today: Task[] = [];

  for (const task of tasks) {
    if (task.status !== "open") continue;

    const interval = getTaskDateInterval(task, context.timeZone);
    if (!interval) continue;

    if (interval.endMs < day.startMs) {
      overdue.push(task);
    } else if (intervalIntersectsDay(interval, day)) {
      today.push(task);
    }
  }

  const sections: TaskSection[] = [];
  if (overdue.length > 0) sections.push({ id: "overdue", title: "Overdue", tasks: overdue });
  if (today.length > 0) sections.push({ id: "today", title: "Today", tasks: today });
  return sections;
}

export function selectNext7Days(tasks: Task[], context: SelectionContext): TaskSection[] {
  const days = Array.from({ length: 7 }, (_, offset) => getLocalDay(context, offset));
  const tasksByDay = new Map(days.map((day) => [day.id, [] as Task[]]));

  for (const task of tasks) {
    if (task.status !== "open") continue;

    const interval = getTaskDateInterval(task, context.timeZone);
    if (!interval) continue;

    const firstIntersectingDay = days.find((day) => intervalIntersectsDay(interval, day));
    if (firstIntersectingDay) tasksByDay.get(firstIntersectingDay.id)!.push(task);
  }

  return days.flatMap((day): TaskSection[] => {
    const dayTasks = tasksByDay.get(day.id)!;
    return dayTasks.length > 0 ? [{ id: day.id, title: day.title, tasks: dayTasks }] : [];
  });
}
