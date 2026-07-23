import { Task } from "../api";
import { addDays, displayDate } from "./dates";

export type SectionWithTasks = { name: string; tasks: Task[] };

function byChildOrder(a: Task, b: Task): number {
  return a.child_order - b.child_order || a.id.localeCompare(b.id);
}

function byPriorityThenOrder(a: Task, b: Task): number {
  return a.priority - b.priority || byChildOrder(a, b);
}

// Timed tasks first (by time), then the rest by priority, mirroring the web app's Today view.
function byTimeThenPriority(a: Task, b: Task): number {
  const aTime = a.due?.time;
  const bTime = b.due?.time;
  if (aTime && bTime) return aTime.localeCompare(bTime) || byPriorityThenOrder(a, b);
  if (aTime) return -1;
  if (bTime) return 1;
  return byPriorityThenOrder(a, b);
}

function byDateThenTime(a: Task, b: Task): number {
  const dateCompare = (a.due?.date ?? "").localeCompare(b.due?.date ?? "");
  return dateCompare || byTimeThenPriority(a, b);
}

export function getOverdueTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter((task) => task.due && task.due.date < today).sort(byDateThenTime);
}

export function getTodayTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter((task) => task.due?.date === today).sort(byTimeThenPriority);
}

export function groupTodayTasks(tasks: Task[], today: string): SectionWithTasks[] {
  const overdue = getOverdueTasks(tasks, today);
  const dueToday = getTodayTasks(tasks, today);
  const sections: SectionWithTasks[] = [];
  if (overdue.length > 0) sections.push({ name: "Overdue", tasks: overdue });
  sections.push({ name: "Today", tasks: dueToday });
  return sections;
}

export function groupUpcomingTasks(tasks: Task[], today: string, days = 7): SectionWithTasks[] {
  const sections: SectionWithTasks[] = [];
  for (let offset = 1; offset <= days; offset++) {
    const date = addDays(today, offset);
    const dayTasks = tasks.filter((task) => task.due?.date === date).sort(byTimeThenPriority);
    if (dayTasks.length > 0) sections.push({ name: displayDate(date, today), tasks: dayTasks });
  }
  const horizon = addDays(today, days);
  const later = tasks.filter((task) => task.due && task.due.date > horizon).sort(byDateThenTime);
  if (later.length > 0) sections.push({ name: "Later", tasks: later });
  return sections;
}

export function groupByDates(tasks: Task[], today: string): SectionWithTasks[] {
  const sections: SectionWithTasks[] = [];
  const overdue = getOverdueTasks(tasks, today);
  const dueToday = getTodayTasks(tasks, today);
  if (overdue.length > 0) sections.push({ name: "Overdue", tasks: overdue });
  if (dueToday.length > 0) sections.push({ name: "Today", tasks: dueToday });
  sections.push(...groupUpcomingTasks(tasks, today));
  const noDate = tasks.filter((task) => !task.due).sort(byPriorityThenOrder);
  if (noDate.length > 0) sections.push({ name: "No Date", tasks: noDate });
  return sections;
}

export function getInboxTasks(tasks: Task[], inboxProjectId: string | undefined): Task[] {
  if (!inboxProjectId) return [];
  return tasks.filter((task) => task.project_id === inboxProjectId).sort(byChildOrder);
}

export function groupBySection(
  tasks: Task[],
  sections: { id: string; name: string; section_order: number }[],
): { unsectioned: Task[]; sections: SectionWithTasks[] } {
  const unsectioned = tasks.filter((task) => !task.section_id).sort(byChildOrder);
  const grouped = [...sections]
    .sort((a, b) => a.section_order - b.section_order)
    .map((section) => ({
      name: section.name,
      tasks: tasks.filter((task) => task.section_id === section.id).sort(byChildOrder),
    }))
    .filter((section) => section.tasks.length > 0);
  return { unsectioned, sections: grouped };
}
