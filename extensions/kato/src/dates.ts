import type { ScheduleItem, Task } from "./types";

export type TaskGroup = "Overdue" | "Today" | "Upcoming" | "Unscheduled";
export type MeetingGroup =
  "Happening Now" | "Next" | "Later Today" | "Tomorrow" | "Later";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function taskGroup(
  task: Pick<Task, "dueDate">,
  now = new Date(),
): TaskGroup {
  if (!task.dueDate) return "Unscheduled";
  const due = new Date(task.dueDate);
  if (sameDay(due, now)) return "Today";
  return due < startOfDay(now) ? "Overdue" : "Upcoming";
}

export function meetingGroup(
  item: Pick<ScheduleItem, "startTime" | "endTime">,
  now = new Date(),
  nextMeetingId?: string,
): MeetingGroup {
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  if (start <= now && end > now) return "Happening Now";
  if (item.startTime === nextMeetingId) return "Next";
  if (sameDay(start, now)) return "Later Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(start, tomorrow)) return "Tomorrow";
  return "Later";
}

export function groupTasks(
  tasks: Task[],
  now = new Date(),
): Record<TaskGroup, Task[]> {
  const result: Record<TaskGroup, Task[]> = {
    Overdue: [],
    Today: [],
    Upcoming: [],
    Unscheduled: [],
  };
  for (const task of tasks) result[taskGroup(task, now)].push(task);
  return result;
}

export function groupMeetings(
  items: ScheduleItem[],
  now = new Date(),
): Record<MeetingGroup, ScheduleItem[]> {
  const next = items.find((item) => new Date(item.startTime) > now);
  const result: Record<MeetingGroup, ScheduleItem[]> = {
    "Happening Now": [],
    Next: [],
    "Later Today": [],
    Tomorrow: [],
    Later: [],
  };
  for (const item of items) {
    const marker = next?.id === item.id ? item.startTime : undefined;
    result[meetingGroup(item, now, marker)].push(item);
  }
  return result;
}

export function formatDueDate(value: string | null): string | undefined {
  if (!value) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatMeetingTime(item: ScheduleItem): string {
  if (item.isAllDay) return "All day";
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time.format(start)}–${time.format(end)}`;
}
