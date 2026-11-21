import { ApiError, type TaskitApi } from "./api";

export const WEB_ORIGIN = "https://kind-hill-09b2c840f.3.azurestaticapps.net";

export const VIEWS = [
  "today",
  "inbox",
  "upcoming",
  "overdue",
  "backlog",
] as const;
export type TaskView = (typeof VIEWS)[number];

export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Task {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  listId?: string;
  dueAt?: string;
  startAt?: string;
  tags?: string[];
}

export interface Named {
  id: string;
  name: string;
}

export function matchNamed<T extends Named>(items: T[], label: string): T {
  const trimmed = label.trim();
  const byId = items.find((item) => item.id === trimmed);
  if (byId) return byId;
  const matches = items.filter(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new ApiError(`No match for "${trimmed}"`, 404, "NOT_FOUND");
  }
  throw new ApiError(`More than one match for "${trimmed}"`, 400, "AMBIGUOUS");
}

export function resolveList(lists: Named[], label: string): Named {
  try {
    return matchNamed(lists, label);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "NOT_FOUND" &&
      label.trim().toLowerCase() === "inbox"
    ) {
      return { id: "inbox", name: "Inbox" };
    }
    throw error;
  }
}

export function taskPage(view?: string): string {
  if (view === "inbox") return "inbox";
  if (view === "upcoming" || view === "overdue") return "upcoming";
  return "today";
}

export function taskUrl(taskId: string, view?: string): string {
  return `${WEB_ORIGIN}/${taskPage(view)}#${encodeURIComponent(taskId)}`;
}

export function formatWhen(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTasks(tasks: Task[]): string {
  if (!tasks.length) return "No tasks.";
  return tasks
    .map((task) => {
      const bits = [task.title];
      if (task.priority && task.priority !== "none") bits.push(task.priority);
      const when = formatWhen(task.dueAt ?? task.startAt);
      if (when) bits.push(when);
      bits.push(task.id);
      return bits.join(" · ");
    })
    .join("\n");
}

export async function createTask(
  api: TaskitApi,
  input: { text: string; list?: string },
): Promise<Task> {
  const title = input.text.trim();
  if (!title) {
    throw new ApiError("Could not parse a task title", 400, "VALIDATION_ERROR");
  }
  const body: Record<string, unknown> = { title, parseNaturalLanguage: true };
  const listName = input.list?.trim();
  if (listName) {
    const lists = (await api.request<Named[]>("GET", "/api/lists")) ?? [];
    body.listId = resolveList(lists, listName).id;
  }
  const created = await api.request<Task>("POST", "/api/tasks", body);
  if (!created?.id)
    throw new ApiError("Could not create task", 500, "INTERNAL_ERROR");
  return created;
}

export async function listTasks(
  api: TaskitApi,
  input: { view?: TaskView; list?: string },
): Promise<Task[]> {
  if (input.list?.trim()) {
    const lists = (await api.request<Named[]>("GET", "/api/lists")) ?? [];
    const list = resolveList(lists, input.list);
    return (
      (await api.request<Task[]>(
        "GET",
        `/api/tasks?listId=${encodeURIComponent(list.id)}`,
      )) ?? []
    );
  }
  const view = input.view ?? "today";
  return (await api.request<Task[]>("GET", `/api/tasks?view=${view}`)) ?? [];
}

export async function searchTasks(
  api: TaskitApi,
  query: string,
): Promise<Task[]> {
  return (
    (await api.request<Task[]>(
      "GET",
      `/api/tasks?q=${encodeURIComponent(query)}`,
    )) ?? []
  );
}

export async function completeTask(api: TaskitApi, id: string): Promise<Task> {
  return api.request<Task>("PATCH", `/api/tasks/${encodeURIComponent(id)}`, {
    status: "completed",
  });
}

export async function updateTask(
  api: TaskitApi,
  input: {
    id: string;
    title?: string;
    list?: string;
    startAt?: string | null;
    dueAt?: string | null;
    priority?: Priority;
  },
): Promise<Task> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.startAt !== undefined) patch.startAt = input.startAt;
  if (input.dueAt !== undefined) patch.dueAt = input.dueAt;
  if (input.list !== undefined) {
    const lists = (await api.request<Named[]>("GET", "/api/lists")) ?? [];
    patch.listId = resolveList(lists, input.list).id;
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError("Nothing to update", 400, "VALIDATION_ERROR");
  }
  return api.request<Task>(
    "PATCH",
    `/api/tasks/${encodeURIComponent(input.id)}`,
    patch,
  );
}

export interface BatchBody {
  ids: string[];
  action:
    | "complete"
    | "reopen"
    | "scheduleToday"
    | "toBacklog"
    | "wontDo"
    | "priority"
    | "move";
  listId?: string;
  priority?: Priority;
}

export async function batchTasks(
  api: TaskitApi,
  body: BatchBody,
): Promise<unknown> {
  return api.request("POST", "/api/tasks/batch", body);
}

export async function listLists(api: TaskitApi): Promise<Named[]> {
  return (await api.request<Named[]>("GET", "/api/lists")) ?? [];
}
