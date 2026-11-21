import { showToast, Toast } from "@raycast/api";

import type { ApiConfig, ProjectLite, TaskLite, UserLite, Subtask } from "./types";

function authenticatedUrl(config: ApiConfig, path: string) {
  const url = `${config.baseUrl}${path}`;
  if (new URL(url).protocol !== "https:") {
    throw new Error("API Base URL must use HTTPS");
  }
  return url;
}

async function request<T>(config: ApiConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(authenticatedUrl(config, path), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    await showToast({ style: Toast.Style.Failure, title: message });
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function whoami(config: ApiConfig) {
  return request<{ ok: boolean; userId: string }>(config, "/api/whoami");
}
export async function listProjects(config: ApiConfig) {
  return request<{
    projects: ProjectLite[];
    lastSelectedProjectId: string | null;
  }>(config, "/api/projects");
}
export async function listUsers(config: ApiConfig) {
  return request<UserLite[]>(config, "/api/users");
}

export async function myTasks(config: ApiConfig): Promise<TaskLite[]> {
  const res = await fetch(authenticatedUrl(config, "/api/tasks.my"), {
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    await showToast({ style: Toast.Style.Failure, title: message });
    throw new Error(message);
  }

  const raw = await res.json();
  if (Array.isArray(raw)) {
    return raw as TaskLite[];
  }
  if (raw && Array.isArray(raw.tasks)) {
    return raw.tasks as TaskLite[];
  }
  return [];
}

// Removed unused API: tasksAssignedByMe
export async function createTask(
  config: ApiConfig,
  body: {
    title: string;
    projectId: string;
    assigneeId?: string;
    description?: string;
    dueDate?: number;
  },
) {
  return request<{ taskId: string }>(config, "/api/tasks.create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export async function updateTask(
  config: ApiConfig,
  body: {
    taskId: string;
    title?: string;
    projectId?: string;
    assigneeId?: string;
    description?: string;
    dueDate?: number;
    status?: TaskLite["status"];
    subtasks?: Subtask[];
  },
) {
  return request<{ ok: boolean }>(config, "/api/tasks.update", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export async function getTask(config: ApiConfig, taskId: string) {
  return request<TaskLite>(config, `/api/task.get?taskId=${encodeURIComponent(taskId)}`);
}
export async function deleteTask(config: ApiConfig, taskId: string) {
  return request<{ ok: boolean }>(config, "/api/tasks.delete", {
    method: "POST",
    body: JSON.stringify({ taskId }),
  });
}
export async function overview(config: ApiConfig) {
  return request<{ user: UserLite; tasks: TaskLite[] }[]>(config, "/api/overview");
}
