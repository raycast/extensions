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

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

export interface TaskReminder {
  /**
   * Absolute reminder timestamp.
   *
   * For a relative reminder the Vikunja web client sends the Unix epoch here
   * rather than null, and the server ignores it when `relative_to` is set.
   * We match that so behaviour is identical to the official frontend.
   */
  reminder: string;
  /** Offset in seconds from `relative_to`. Negative means before. */
  relative_period: number;
  /** Which task date the offset applies to. */
  relative_to: "due_date" | "start_date" | "end_date";
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string | null;
  is_favorite?: boolean;
  repeat_after?: number;
  repeat_mode?: number;
  reminders?: TaskReminder[];
  /** Assignees are accepted directly on create, same as the web client does. */
  assignees?: User[];
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

/**
 * Fetches every page of a paginated collection.
 *
 * Vikunja pages list endpoints (50 per page by default) and reports the page
 * count in `x-pagination-total-pages`. Without this, instances with more than
 * one page of labels would make existing labels look missing, which would then
 * get duplicated on create.
 */
async function requestAll<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const results: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${getBaseUrl()}/api/v1${path}${separator}page=${page}`;
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Vikunja API error (${response.status}): ${body}`);
    }

    const items = (await response.json()) as T[];
    results.push(...items);

    if (page === 1) {
      const reported = Number(
        response.headers.get("x-pagination-total-pages") ?? "1",
      );
      totalPages = Number.isFinite(reported) && reported > 0 ? reported : 1;
    }

    page += 1;
  } while (page <= totalPages);

  return results;
}

export async function getProjects(includeArchived = false): Promise<Project[]> {
  const projects = await requestAll<Project>("/projects");
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
  return requestAll<Label>("/labels");
}

/**
 * Searches the members of a project.
 *
 * Assignees can only be resolved per project, so this is called with the
 * project the task will land in.
 */
export async function getProjectUsers(
  projectId: number,
  search: string,
): Promise<User[]> {
  return request<User[]>(
    `/projects/${projectId}/projectusers?s=${encodeURIComponent(search)}`,
  );
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

export async function removeLabelFromTask(
  taskId: number,
  labelId: number,
): Promise<void> {
  await request(`/tasks/${taskId}/labels/${labelId}`, { method: "DELETE" });
}

export async function addLabelsToTask(
  taskId: number,
  labelIds: number[],
): Promise<void> {
  await Promise.all(labelIds.map((labelId) => addLabelToTask(taskId, labelId)));
}

export async function createLabel(title: string): Promise<Label> {
  return request<Label>("/labels", {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

export async function updateTaskLabels(
  taskId: number,
  oldLabelIds: number[],
  newLabelIds: number[],
): Promise<void> {
  const toRemove = oldLabelIds.filter((id) => !newLabelIds.includes(id));
  const toAdd = newLabelIds.filter((id) => !oldLabelIds.includes(id));
  for (const labelId of toRemove) {
    await removeLabelFromTask(taskId, labelId);
  }
  for (const labelId of toAdd) {
    await addLabelToTask(taskId, labelId);
  }
}

export async function getProjectTasks(projectId: number): Promise<Task[]> {
  return request<Task[]>(
    `/projects/${projectId}/tasks?sort_by=done&order_by=asc`,
  );
}

export async function getAllTasks(): Promise<Task[]> {
  return request<Task[]>("/tasks?sort_by=done&order_by=asc");
}

export async function searchTasks(query: string): Promise<Task[]> {
  return request<Task[]>(
    `/tasks?s=${encodeURIComponent(query)}&sort_by=done&order_by=asc`,
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
