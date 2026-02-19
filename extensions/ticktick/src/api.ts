import { getPreferenceValues } from "@raycast/api";
import { API_BASE_URL } from "./constants";
import { Preferences, Project, ProjectData, Task } from "./types";

function getHeaders(): HeadersInit {
  const { apiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `TickTick API error ${response.status}: ${text || response.statusText}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getProjects(): Promise<Project[]> {
  return request<Project[]>("/project");
}

export async function getProjectData(projectId: string): Promise<ProjectData> {
  return request<ProjectData>(`/project/${projectId}/data`);
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  return request<Task>("/task", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export async function updateTask(
  taskId: string,
  task: Partial<Task>,
): Promise<Task> {
  return request<Task>(`/task/${taskId}`, {
    method: "POST",
    body: JSON.stringify({ id: taskId, ...task }),
  });
}

export async function completeTask(
  projectId: string,
  taskId: string,
): Promise<void> {
  return request<void>(`/project/${projectId}/task/${taskId}/complete`, {
    method: "POST",
  });
}

export async function deleteTask(
  projectId: string,
  taskId: string,
): Promise<void> {
  return request<void>(`/project/${projectId}/task/${taskId}`, {
    method: "DELETE",
  });
}
