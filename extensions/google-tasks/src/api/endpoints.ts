import { Cache, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Task, TaskForm, Tasklist } from "../types";
import { cacheKey, isCompleted } from "../utils";
import { client } from "./oauth";

// Cache
const cache = new Cache();
const TASKLISTS_KEY = cacheKey("tasklists");
const TASKS_KEY_PREFIX = cacheKey("tasks");

const getCachedTasklists = (): Tasklist[] => JSON.parse(cache.get(TASKLISTS_KEY) || "[]");
export const getCachedTasksByListId = (tasklist: string): Task[] =>
  JSON.parse(cache.get(`${TASKS_KEY_PREFIX}-${tasklist}`) || "[]");

export async function getDefaultList(): Promise<Tasklist> {
  const { tasklistTitle } = getPreferenceValues();

  // get from cache
  let tasklist = getCachedTasklists().find((l) => l.title === tasklistTitle);
  if (tasklist) return tasklist;

  // get from api
  const tasklists = await fetchLists();
  tasklist = tasklists.find((l) => l.title === tasklistTitle);
  if (tasklist) return tasklist;

  // not found
  throw new Error(`This tasklist not found: ${tasklistTitle}`);
}

// API
function cacheTasklists(tasklists: Tasklist[]) {
  cache.set(TASKLISTS_KEY, JSON.stringify(tasklists));
}
function cacheTasks(tasklist: string, tasks: Task[]) {
  cache.set(`${TASKS_KEY_PREFIX}-${tasklist}`, JSON.stringify(tasks));
}

export async function fetchLists(): Promise<Tasklist[]> {
  const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as {
    items: { id: string; title: string }[];
  };

  const tasklists: Tasklist[] = json.items.map((item) => ({ id: item.id, title: item.title }));
  cacheTasklists(tasklists);

  return tasklists;
}

export async function fetchList(tasklist: string): Promise<Task[]> {
  const params = new URLSearchParams();
  params.append("showCompleted", "true");
  params.append("showHidden", "true");
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks?` + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as {
    items: Task[];
  };

  const tasks: Task[] = json.items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    due: item.due,
    completed: item.completed,
    parent: item.parent,
    notes: item.notes,
  }));
  cacheTasks(tasklist, tasks);

  return tasks;
}

export async function deleteTask(tasklist: string, id: string): Promise<void> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}

export async function createTask(tasklist: string, task: TaskForm): Promise<void> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`, {
    method: "POST",
    body: JSON.stringify(task),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}

export async function editTask(tasklist: string, task: Task): Promise<void> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify(task),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}

export async function toggleTask(tasklist: string, task: Task): Promise<void> {
  const payload: { status: string } = { status: "" };
  if (isCompleted(task)) {
    payload["status"] = "needsAction";
  } else {
    payload["status"] = "completed";
  }
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}
