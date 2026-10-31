import { LocalStorage } from "@raycast/api";

import type { AnyDoClient } from "./client";
import { formatJalaliDate, toPersianDigits } from "./jalali";
import { journalCompleted } from "./journal";
import { lang } from "./prefs";
import type { AnyDoTask } from "./types";

const KEY = "anydo:completed-history";
const MAX_ENTRIES = 500;

export interface CompletedEntry {
  id: string;
  title: string;
  at: number;
  listId?: string;
}

/**
 * Any.do's API only returns *workspace* completed tasks, so the extension keeps its own local log
 * of everything it completed. That log is what makes "reopen a finished task" possible at all.
 */
export async function loadCompleted(): Promise<CompletedEntry[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CompletedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function recordCompleted(
  task: AnyDoTask,
  listName?: string,
): Promise<void> {
  const entries = await loadCompleted();
  const without = entries.filter((entry) => entry.id !== task.task_id);
  without.push({
    id: task.task_id,
    title: task.title,
    at: Date.now(),
    listId: task.list_id,
  });
  await LocalStorage.setItem(KEY, JSON.stringify(without.slice(-MAX_ENTRIES)));
  await journalCompleted(task, listName);
}

/** Removes a task from the local log (used when it is reopened). */
export async function removeFromHistory(taskId: string): Promise<void> {
  const entries = await loadCompleted();
  await LocalStorage.setItem(
    KEY,
    JSON.stringify(entries.filter((entry) => entry.id !== taskId)),
  );
}

export async function clearCompleted(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}

export interface VerifiedCompleted {
  entries: CompletedEntry[];
  tasks: AnyDoTask[];
}

/** Re-reads the completed tasks from Any.do by id (the API cannot list them for us). */
export async function verifyCompleted(
  client: AnyDoClient,
  limit = 60,
): Promise<VerifiedCompleted> {
  const entries = (await loadCompleted()).slice(-limit).reverse();
  const results = await Promise.allSettled(
    entries.map((entry) => client.getTask(entry.id)),
  );

  const tasks: AnyDoTask[] = [];
  const kept: CompletedEntry[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      tasks.push(result.value);
      kept.push(entries[index]);
    }
  });
  return { entries: kept, tasks };
}

export interface DayBucket {
  label: string;
  count: number;
  date: Date;
}

/** One bucket per day for the last `days` days (oldest first). */
export function bucketsByDay(
  entries: CompletedEntry[],
  days: number,
  now: Date = new Date(),
): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offset,
    );
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );
    const count = entries.filter(
      (entry) => entry.at >= date.getTime() && entry.at < next.getTime(),
    ).length;
    const label =
      lang() === "en"
        ? date.toLocaleDateString("en-CA", { day: "2-digit", month: "short" })
        : formatJalaliDate(date);
    buckets.push({ label, count, date });
  }
  return buckets;
}

/** Simple text bar chart (renders inside Raycast's markdown Detail). */
export function barChart(buckets: DayBucket[]): string {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return buckets
    .map((bucket) => {
      const filled = Math.round((bucket.count / max) * 12);
      const bar = "█".repeat(filled) + "░".repeat(12 - filled);
      const count =
        lang() === "en" ? String(bucket.count) : toPersianDigits(bucket.count);
      return `\`${bar}\` **${count}**  ${bucket.label}`;
    })
    .join("\n\n");
}

export { toPersianDigits };
