import { getPreferenceValues } from "@raycast/api";

// Wire types for OpenTask's /api/v1 (snake_case, list responses wrapped in { results, next_cursor })

export type Due = {
  date: string; // YYYY-MM-DD in the user's timezone
  time: string | null; // HH:mm (24h) or null for all-day
  string: string;
  is_recurring: boolean;
  recurrence: unknown | null;
};

export type Task = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  child_order: number;
  content: string;
  description: string;
  priority: 1 | 2 | 3 | 4; // 1 is the highest
  due: Due | null;
  deadline_date: string | null;
  deadline_time: string | null;
  duration_min: number | null;
  day_order: number;
  labels: string[]; // label names
  is_collapsed: boolean;
  uncompletable: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  parent_id: string | null;
  child_order: number;
  is_favorite: boolean;
  is_archived: boolean;
  is_collapsed: boolean;
  is_inbox: boolean;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: string;
  project_id: string;
  name: string;
  section_order: number;
  is_archived: boolean;
  is_collapsed: boolean;
};

export type Label = {
  id: string;
  name: string;
  color: string;
  item_order: number;
  is_favorite: boolean;
};

export type SearchResult = {
  task: Task;
  matched_in: "task" | "comment";
  snippet: string;
};

export type UserSettings = {
  timezone: string;
  timeFormat: "12h" | "24h";
  homeView?: string;
};

export type DueInput = { string?: string; date?: string; time?: string } | null;

export type CreateTaskBody = {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string | null;
  parent_id?: string | null;
  priority?: 1 | 2 | 3 | 4;
  due?: DueInput;
  deadline_date?: string | null;
  deadline_time?: string | null;
  labels?: string[];
};

export type UpdateTaskBody = Partial<CreateTaskBody>;

type Page<T> = { results: T[]; next_cursor: string | null };

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getBaseUrl(): string {
  const { baseUrl } = getPreferenceValues<Preferences>();
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export function getTaskUrl(id: string): string {
  return `${getBaseUrl()}/task/${id}`;
}

export function getProjectUrl(id: string): string {
  return `${getBaseUrl()}/project/${id}`;
}

export function getLabelUrl(id: string): string {
  return `${getBaseUrl()}/label/${id}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiToken } = getPreferenceValues<Preferences>();

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/api/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(`Could not reach ${getBaseUrl()} — check the OpenTask URL in the extension preferences`);
  }

  if (!response.ok) {
    // OpenTask errors are RFC 9457 problem+json: { type, title, status, detail? }
    let message = `Request failed (${response.status})`;
    try {
      const problem = (await response.json()) as { title?: string; detail?: string };
      if (problem.title) {
        message = problem.detail ? `${problem.title}: ${problem.detail}` : problem.title;
      }
    } catch {
      // not JSON, keep the generic message
    }
    if (response.status === 401) {
      message = "Unauthorized — check the API token in the extension preferences";
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function getOpenTasks(): Promise<Task[]> {
  const tasks: Task[] = [];
  let cursor: string | null = null;
  do {
    const page: Page<Task> = await request(`/tasks?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    tasks.push(...page.results);
    cursor = page.next_cursor;
  } while (cursor && tasks.length < 5000);
  return tasks;
}

export async function getTask(id: string): Promise<Task> {
  return request(`/tasks/${id}`);
}

export async function getCompletedTasks(): Promise<Task[]> {
  const page: Page<Task> = await request(`/tasks/completed?limit=100`);
  return page.results;
}

export async function getProjects(): Promise<Project[]> {
  const page: Page<Project> = await request(`/projects`);
  return page.results;
}

export async function getSections(projectId: string): Promise<Section[]> {
  const page: Page<Section> = await request(`/sections?project_id=${encodeURIComponent(projectId)}`);
  return page.results;
}

export async function getLabels(): Promise<Label[]> {
  const page: Page<Label> = await request(`/labels`);
  return page.results;
}

export async function getUserSettings(): Promise<UserSettings> {
  return request(`/user/settings`);
}

export async function searchTasks(query: string, includeCompleted: boolean): Promise<SearchResult[]> {
  const page: Page<SearchResult> = await request(
    `/search?q=${encodeURIComponent(query)}&limit=50${includeCompleted ? "&include_completed=true" : ""}`,
  );
  return page.results;
}

export async function createTask(body: CreateTaskBody): Promise<Task> {
  return request(`/tasks`, { method: "POST", body: JSON.stringify(body) });
}

export async function quickAddTask(text: string): Promise<Task> {
  return request(`/tasks/quick`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function updateTask(id: string, body: UpdateTaskBody): Promise<Task> {
  return request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function closeTask(id: string): Promise<Task> {
  return request(`/tasks/${id}/close`, { method: "POST", body: JSON.stringify({}) });
}

export async function reopenTask(id: string): Promise<Task> {
  return request(`/tasks/${id}/reopen`, { method: "POST", body: JSON.stringify({}) });
}

export async function deleteTask(id: string): Promise<void> {
  return request(`/tasks/${id}`, { method: "DELETE" });
}

export async function moveTask(id: string, projectId: string): Promise<Task> {
  return request(`/tasks/${id}/move`, { method: "POST", body: JSON.stringify({ project_id: projectId }) });
}
