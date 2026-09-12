import { LocalStorage } from "@raycast/api";
import * as google from "../api/oauth";
import { fetchList, fetchListPage, fetchLists } from "../api/endpoints";
import { Task, TaskList, TaskWithList } from "../types";
import { defaultListKey, dueDay, isCompleted, todayValue } from "../utils";

export type TaskView = "open" | "overdue" | "today" | "upcoming" | "undated" | "completed";

export async function ensureAuth(): Promise<void> {
  try {
    await google.authorize();
  } catch (error) {
    throw new Error(google.describeAuthorizationError(error).message);
  }
}

export function parseDueDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error("Due date must be YYYY-MM-DD.");
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error("Due date must be YYYY-MM-DD.");
  }
  return date;
}

export function compactTask(task: TaskWithList) {
  const due = dueDay(task.due);
  const today = todayValue();
  const completed = isCompleted(task);
  return {
    id: task.id,
    listId: task.listId,
    listTitle: task.listTitle,
    title: task.title,
    notesSnippet: task.notes ? task.notes.slice(0, 160) : undefined,
    due: due ?? null,
    status: completed ? "completed" : "open",
    overdue: !completed && !!due && due < today,
  };
}

export async function loadLists(): Promise<TaskList[]> {
  await ensureAuth();
  const lists = await fetchLists();
  if (lists.length === 0) {
    throw new Error("No Google Task lists found.");
  }
  return lists;
}

export async function resolveList(listId?: string, listName?: string): Promise<TaskList> {
  const lists = await loadLists();
  if (listId) {
    const list = lists.find((item) => item.id === listId);
    if (!list) {
      throw new Error("Unknown list id. Call list-task-lists or search-tasks first.");
    }
    return list;
  }
  if (listName?.trim()) {
    const needle = listName.trim().toLowerCase();
    const exact = lists.filter((item) => item.title.toLowerCase() === needle);
    if (exact.length === 1) return exact[0];
    const partial = lists.filter((item) => item.title.toLowerCase().includes(needle));
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) {
      throw new Error(
        'Multiple lists match "' + listName + '": ' + partial.map((item) => item.title).join(", ") + ". Pass listId.",
      );
    }
    throw new Error('No list named "' + listName + '". Call list-task-lists.');
  }
  const saved = await LocalStorage.getItem<string>(defaultListKey);
  return lists.find((item) => item.id === saved) ?? lists[0];
}

function matchesView(task: TaskWithList, view: TaskView): boolean {
  const due = dueDay(task.due);
  const today = todayValue();
  const completed = isCompleted(task);
  if (view === "completed") return completed;
  if (completed) return false;
  if (view === "open") return true;
  if (view === "overdue") return !!due && due < today;
  if (view === "today") return due === today;
  if (view === "upcoming") return !!due && due > today;
  if (view === "undated") return !due;
  return true;
}

export async function loadTasks(options: { view: TaskView; listId?: string }): Promise<TaskWithList[]> {
  const lists = await loadLists();
  const selected = options.listId ? lists.filter((list) => list.id === options.listId) : lists;
  if (options.listId && selected.length === 0) {
    throw new Error("Unknown list id. Call list-task-lists or search-tasks first.");
  }

  const pages = await Promise.all(
    selected.map(async (list) => {
      const tasks = await fetchList(list.id, options.view === "completed");
      return tasks.map((task) => ({ ...task, listId: list.id, listTitle: list.title }));
    }),
  );
  return pages.flat();
}

export async function searchTasks(input: {
  query?: string;
  view?: TaskView;
  listId?: string;
  listName?: string;
  limit?: number;
  offset?: number;
}) {
  const view = input.view ?? "open";
  const list = input.listId || input.listName ? await resolveList(input.listId, input.listName) : undefined;
  const tasks = await loadTasks({ view, listId: list?.id });
  const query = input.query?.trim().toLowerCase();
  const matched = tasks.filter((task) => {
    if (!matchesView(task, view)) return false;
    if (!query) return true;
    return (task.title + " " + (task.notes ?? "") + " " + task.listTitle).toLowerCase().includes(query);
  });
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const offset = Math.min(Math.max(input.offset ?? 0, 0), matched.length);
  const page = matched.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    total: matched.length,
    shown: page.length,
    offset,
    nextOffset: nextOffset < matched.length ? nextOffset : undefined,
    hasMore: nextOffset < matched.length,
    view,
    listId: list?.id,
    listTitle: list?.title,
    tasks: page.map(compactTask),
  };
}

export async function requireTask(listId: string, taskId: string): Promise<TaskWithList> {
  const list = await resolveList(listId);
  const open = await fetchList(list.id, false);
  let task: Task | undefined = open.find((item) => item.id === taskId);
  if (!task) {
    let pageToken: string | undefined;
    do {
      const page = await fetchListPage(list.id, true, pageToken);
      task = page.tasks.find((item) => item.id === taskId);
      if (task) break;
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  if (!task) {
    throw new Error("Task not found. Call search-tasks and use the returned id and listId.");
  }
  return { ...task, listId: list.id, listTitle: list.title };
}
