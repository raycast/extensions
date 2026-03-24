import { getPreferenceValues } from "@raycast/api";

export interface Project {
  id: number;
  title: string;
  description: string;
  is_archived: boolean;
  parent_project_id: number | null;
  hex_color: string;
  identifier: string;
}

export interface ProjectInput {
  title: string;
  description?: string;
  parent_project_id?: number | null;
  hex_color?: string;
  identifier?: string;
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

async function fetchAllPages<T>(
  buildPath: (page: number) => string,
): Promise<T[]> {
  const perPage = 100;
  const results: T[] = [];
  let page = 1;

  while (true) {
    const pageItems = await request<T[]>(buildPath(page));
    results.push(...pageItems);

    if (pageItems.length < perPage) {
      break;
    }

    page += 1;
  }

  return results;
}

export async function getProjects(includeArchived = false): Promise<Project[]> {
  const projects = await fetchAllPages<Project>(
    (page) => `/projects?page=${page}&per_page=100`,
  );
  return includeArchived ? projects : projects.filter((p) => !p.is_archived);
}

export async function createProject(project: ProjectInput): Promise<Project> {
  return request<Project>("/projects", {
    method: "PUT",
    body: JSON.stringify(project),
  });
}

export async function updateProject(
  projectId: number,
  updates: Partial<ProjectInput & { is_archived: boolean }>,
): Promise<Project> {
  return request<Project>(`/projects/${projectId}`, {
    method: "POST",
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(projectId: number): Promise<void> {
  await request(`/projects/${projectId}`, { method: "DELETE" });
}

export async function getLabels(): Promise<Label[]> {
  return fetchAllPages<Label>((page) => `/labels?page=${page}&per_page=100`);
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
  await Promise.all(labelIds.map((labelId) => addLabelToTask(taskId, labelId)));
}

export async function getProjectTasks(projectId: number): Promise<Task[]> {
  return fetchAllPages<Task>(
    (page) =>
      `/projects/${projectId}/tasks?sort_by=done&order_by=asc&page=${page}&per_page=100`,
  );
}

export async function getAllTasks(): Promise<Task[]> {
  return fetchAllPages<Task>(
    (page) => `/tasks?sort_by=done&order_by=asc&page=${page}&per_page=100`,
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
  updates: Partial<TaskInput & { done: boolean; project_id: number }>,
): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {
    method: "POST",
    body: JSON.stringify(updates),
  });
}
