import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiUrl: string;
  apiToken: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  is_archived: boolean;
}

export interface Label {
  id: number;
  title: string;
  hex_color: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: number;
  due_date: string | null;
  is_favorite: boolean;
  done: boolean;
  project_id: number;
  labels: Label[];
  created: string;
  updated: string;
}

export const PRIORITY_MAP: Record<number, string> = {
  0: "Unset",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
  5: "DO NOW",
};

export interface TaskInput {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string | null;
  is_favorite?: boolean;
}

function getBaseUrl(): string {
  const { apiUrl } = getPreferenceValues<Preferences>();
  return apiUrl.replace(/\/+$/, "");
}

function getHeaders(): Record<string, string> {
  const { apiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}/api/v1${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vikunja API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function getProjects(): Promise<Project[]> {
  const projects = await request<Project[]>("/projects");
  return projects.filter((p) => !p.is_archived);
}

export async function getLabels(): Promise<Label[]> {
  return request<Label[]>("/labels");
}

export async function createTask(
  projectId: number,
  task: TaskInput,
): Promise<Task> {
  // Vikunja uses PUT for creation
  return request<Task>(`/projects/${projectId}/tasks`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

export async function addLabelToTask(
  taskId: number,
  labelId: number,
): Promise<void> {
  // Vikunja uses PUT to add labels to tasks
  await request(`/tasks/${taskId}/labels`, {
    method: "PUT",
    body: JSON.stringify({ label_id: labelId }),
  });
}

export async function addLabelsToTask(
  taskId: number,
  labelIds: number[],
): Promise<void> {
  for (const labelId of labelIds) {
    await addLabelToTask(taskId, labelId);
  }
}

export async function getProjectTasks(projectId: number): Promise<Task[]> {
  return request<Task[]>(
    `/projects/${projectId}/tasks?sort_by=done&order_by=asc`,
  );
}

export async function toggleTaskDone(task: Task): Promise<Task> {
  // Vikunja uses POST for updates
  return request<Task>(`/tasks/${task.id}`, {
    method: "POST",
    body: JSON.stringify({ done: !task.done }),
  });
}

export async function deleteTask(taskId: number): Promise<void> {
  await request(`/tasks/${taskId}`, { method: "DELETE" });
}

export async function updateTask(
  taskId: number,
  updates: Partial<TaskInput & { done: boolean }>,
): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {
    method: "POST",
    body: JSON.stringify(updates),
  });
}
