import { dueDate } from "./format";
import { formatJalaliDateTime, toAsciiDigits } from "./jalali";
import type { AnyDoList, AnyDoTask } from "./types";

/** Normalises Persian/Arabic characters and digits for loose matching. */
export function normalizeForSearch(input: string): string {
  return toAsciiDigits(input)
    .replace(/\u200c/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u064B-\u0652]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function taskMatches(task: AnyDoTask, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (!needle) return true;
  const haystack = normalizeForSearch(`${task.title} ${task.note ?? ""}`);
  if (haystack.includes(needle)) return true;
  const words = needle.split(" ").filter((word) => word.length > 1);
  if (words.length === 0) return false;
  const hits = words.filter((word) => haystack.includes(word)).length;
  return hits / words.length >= 0.6;
}

/** Best-effort lookup of a task by id, exact title or fuzzy title. */
export function findTask(
  tasks: AnyDoTask[],
  needle: string,
): AnyDoTask | undefined {
  const open = tasks.filter((task) => task.status === "unchecked");
  const exactId = open.find((task) => task.task_id === needle);
  if (exactId) return exactId;

  const target = normalizeForSearch(needle);
  const exactTitle = open.find(
    (task) => normalizeForSearch(task.title) === target,
  );
  if (exactTitle) return exactTitle;

  const scored = open
    .map((task) => {
      const title = normalizeForSearch(task.title);
      let score = 0;
      if (!target) return { task, score };
      if (title.includes(target)) score += 100;
      if (target.includes(title)) score += 60;
      const words = target.split(" ").filter((word) => word.length > 1);
      score += words.filter((word) => title.includes(word)).length * 10;
      return { task, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.task;
}

export function listTitleOf(lists: AnyDoList[], listId: string): string {
  return lists.find((list) => list.list_id === listId)?.title ?? "بدون لیست";
}

export function dueLabel(task: AnyDoTask): string | null {
  const due = dueDate(task);
  if (!due) return null;
  return formatJalaliDateTime(due, Boolean(task.datetime));
}

export function isOverdue(task: AnyDoTask, now: Date = new Date()): boolean {
  const due = dueDate(task);
  if (!due) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today.getTime();
}

export function isDueNow(task: AnyDoTask, now: Date = new Date()): boolean {
  const due = dueDate(task);
  return Boolean(due && due.getTime() <= now.getTime());
}

export type DueWindow = "today" | "tomorrow" | "week" | "overdue" | "all";

export function withinWindow(
  task: AnyDoTask,
  when: DueWindow,
  now: Date = new Date(),
): boolean {
  if (when === "all") return true;
  const due = dueDate(task);
  if (!due) return false;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
      start.getTime()) /
      86_400_000,
  );
  if (when === "overdue") return days < 0;
  if (when === "today") return days === 0;
  if (when === "tomorrow") return days === 1;
  return days >= 0 && days <= 7;
}

export function byDueThenTitle(left: AnyDoTask, right: AnyDoTask): number {
  const leftDue = dueDate(left)?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightDue = dueDate(right)?.getTime() ?? Number.POSITIVE_INFINITY;
  return leftDue - rightDue || left.title.localeCompare(right.title);
}
