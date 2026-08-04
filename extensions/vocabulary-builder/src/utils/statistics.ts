import { NotebookEntry } from "../data/types";

export function getTodayCount(entries: NotebookEntry[]): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return entries.filter((e) => e.timestamp >= startOfDay.getTime()).length;
}

export function getWeekCount(entries: NotebookEntry[]): number {
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

  return entries.filter((e) => e.timestamp >= startOfWeek.getTime()).length;
}
