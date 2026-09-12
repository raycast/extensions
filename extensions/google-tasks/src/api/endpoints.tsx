import { EditableTask, Task, TaskForm, TaskList } from "../types";
import { isCompleted } from "../utils";
import { client } from "./oauth";

const apiUrl = "https://tasks.googleapis.com/tasks/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function fetchLists(): Promise<TaskList[]> {
  const lists: TaskList[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: "1000" });
    if (pageToken) params.append("pageToken", pageToken);
    const json = await request<{ items?: TaskList[]; nextPageToken?: string }>(`/users/@me/lists?${params.toString()}`);
    lists.push(...(json.items ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);

  return lists;
}

export async function fetchList(tasklist: string, showCompleted = false): Promise<Task[]> {
  const tasks: Task[] = [];
  let pageToken: string | undefined;

  do {
    const page = await fetchListPage(tasklist, showCompleted, pageToken, 100);
    tasks.push(...page.tasks);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return tasks;
}

export async function fetchListPage(
  tasklist: string,
  showCompleted: boolean,
  pageToken?: string,
  maxResults = 25,
): Promise<{ tasks: Task[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    showHidden: "true",
    maxResults: String(maxResults),
    showCompleted: String(showCompleted),
  });
  if (pageToken) params.append("pageToken", pageToken);
  const json = await request<{ items?: Task[]; nextPageToken?: string }>(
    `/lists/${tasklist}/tasks?${params.toString()}`,
  );
  return { tasks: json.items ?? [], nextPageToken: json.nextPageToken };
}

export async function fetchCompletedPage(
  tasklist: string,
  pageToken?: string,
): Promise<{ tasks: Task[]; nextPageToken?: string }> {
  const tasks: Task[] = [];
  let token = pageToken;
  do {
    const page = await fetchListPage(tasklist, true, token, 100);
    tasks.push(...page.tasks.filter(isCompleted));
    token = page.nextPageToken;
  } while (token && tasks.length < 25);
  return { tasks, nextPageToken: token };
}

export async function deleteTask(tasklist: string, id: string): Promise<void> {
  await request<void>(`/lists/${tasklist}/tasks/${id}`, { method: "DELETE" });
}

function serializeTaskDueDate<T extends { due?: string | Date | null }>(task: T): T {
  if (!(task.due instanceof Date)) {
    return task;
  }

  const year = task.due.getFullYear();
  const month = String(task.due.getMonth() + 1).padStart(2, "0");
  const day = String(task.due.getDate()).padStart(2, "0");

  return {
    ...task,
    due: `${year}-${month}-${day}T00:00:00.000Z`,
  } as T;
}

export async function createTask(tasklist: string, task: TaskForm): Promise<void> {
  const payload = serializeTaskDueDate(task);
  await request(`/lists/${tasklist}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function editTask(tasklist: string, task: EditableTask): Promise<void> {
  const payload = serializeTaskDueDate({ title: task.title, notes: task.notes, due: task.due });
  await request(`/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function setTaskStatus(tasklist: string, task: Task, status: "needsAction" | "completed"): Promise<void> {
  await request(`/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function toggleTask(tasklist: string, task: Task): Promise<void> {
  return setTaskStatus(tasklist, task, isCompleted(task) ? "needsAction" : "completed");
}
