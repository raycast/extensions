import fetch, { type RequestInit } from "node-fetch";
import { getAccessToken } from "./auth";

const BASE_URL = "https://tasks.googleapis.com/tasks/v1";

export type GoogleTaskList = {
  id: string;
  title: string;
};

export type GoogleTask = {
  id: string;
  title: string;
  status?: string;
  due?: string;
};

export type TaskListsResponse = {
  items?: GoogleTaskList[];
};

export type TasksResponse = {
  items?: GoogleTask[];
};

type GoogleApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function parseGoogleApiError(responseText: string): string | undefined {
  try {
    const parsed = JSON.parse(responseText) as GoogleApiErrorPayload;
    return parsed.error?.message;
  } catch {
    return undefined;
  }
}

export async function googleFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.ok) {
    if (res.status === 204) {
      return {} as T;
    }
    return (await res.json()) as T;
  }

  const text = await res.text();
  const parsedMessage = parseGoogleApiError(text);
  const errorMessage = parsedMessage ?? text;
  throw new Error(`Google API Error (${res.status}): ${errorMessage}`);
}

export async function listTaskLists(): Promise<TaskListsResponse> {
  return googleFetch<TaskListsResponse>("/users/@me/lists");
}

export async function listTasks(listId: string): Promise<TasksResponse> {
  return googleFetch<TasksResponse>(`/lists/${listId}/tasks`);
}

export async function createTask(
  listId: string,
  title: string,
  due?: Date,
): Promise<GoogleTask> {
  const body: { title: string; due?: string } = { title };

  if (due) {
    body.due = due.toISOString(); // Google expects RFC3339
  }

  return googleFetch<GoogleTask>(`/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createList(title: string): Promise<GoogleTaskList> {
  return googleFetch<GoogleTaskList>("/users/@me/lists", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function completeTask(
  listId: string,
  taskId: string,
): Promise<GoogleTask> {
  return googleFetch<GoogleTask>(`/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" }),
  });
}
