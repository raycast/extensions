import { makeClient } from "../anydo/auth";
import {
  byDueThenTitle,
  dueLabel,
  isOverdue,
  listTitleOf,
  withinWindow,
} from "../anydo/match";
import type { AnyDoTask } from "../anydo/types";

/** Summarises the user's day in Any.do. */
export default async function tool() {
  const client = makeClient();
  const [lists, tasks] = await Promise.all([
    client.getLists(),
    client.getAllTasks(),
  ]);
  const now = new Date();
  const open = tasks.filter((task) => task.status === "unchecked");

  const toRow = (task: AnyDoTask) => ({
    id: task.task_id,
    title: task.title,
    list: listTitleOf(lists, task.list_id),
    due: dueLabel(task) ?? "بدون تاریخ",
    overdue: isOverdue(task, now),
  });

  const today = open
    .filter((task) => withinWindow(task, "today", now))
    .sort(byDueThenTitle);
  const overdue = open
    .filter((task) => withinWindow(task, "overdue", now))
    .sort(byDueThenTitle);
  const soon = open
    .filter((task) => withinWindow(task, "week", now))
    .sort(byDueThenTitle);

  return {
    counts: {
      overdue: overdue.length,
      today: today.length,
      nextSevenDays: soon.length,
      open: open.length,
    },
    overdue: overdue.map(toRow),
    today: today.map(toRow),
    nextSevenDays: soon.map(toRow),
  };
}
