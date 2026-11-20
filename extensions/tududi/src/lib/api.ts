import { getPreferenceValues } from "@raycast/api";
import type { Note, Project, ProjectsResponse, Tag, Task, TasksResponse } from "./types";

function normalizeBaseUrl(apiUrl: string): string {
  let base = apiUrl.trim().replace(/\/+$/, "");
  // Accept either instance root or a path that already includes /api(/v1)
  base = base.replace(/\/api(?:\/v1)?$/i, "");
  return base;
}

function getConfig() {
  const preferences = getPreferenceValues<Preferences>();
  const baseUrl = normalizeBaseUrl(preferences.apiUrl);
  return {
    baseUrl,
    apiBase: `${baseUrl}/api/v1`,
    token: preferences.token.trim(),
  };
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string; details?: string[] };
    if (body.details?.length) return body.details.join(", ");
    if (body.message) return body.message;
    if (body.error) return body.error;
  } catch {
    // ignore JSON parse errors
  }
  return response.statusText || fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiBase, token } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Request failed (${response.status})`));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getWebUrl(path: string): string {
  const { baseUrl } = getConfig();
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizeNote(note: Note): Note {
  return {
    ...note,
    tags: note.tags ?? note.Tags ?? [],
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const data = await request<ProjectsResponse>("/projects");
  return (data.projects ?? []).filter((p) => p && p.id != null && p.name);
}

export async function fetchTags(): Promise<Tag[]> {
  const data = await request<Tag[] | { tags: Tag[] }>("/tags");
  const tags = Array.isArray(data) ? data : (data.tags ?? []);
  return tags.filter((t) => t && t.uid && t.name);
}

export async function fetchTasks(query = ""): Promise<Task[]> {
  const path = query ? `/tasks?${query}` : "/tasks";
  const data = await request<TasksResponse | Task[]>(path);
  if (Array.isArray(data)) return data;
  return data.tasks ?? [];
}

export async function fetchTodayTasks(): Promise<Task[]> {
  // type=today returns tasks in the Today plan (in_progress / planned / waiting)
  // plus recurring instances due today — matching current Tududi behavior.
  return fetchTasks("type=today");
}

export async function fetchAllTasks(): Promise<Task[]> {
  return fetchTasks("type=all&client_side_filtering=true");
}

export async function fetchNotes(): Promise<Note[]> {
  const data = await request<Note[]>("/notes");
  return (data ?? []).filter((n) => n && n.id != null && n.uid && n.title).map(normalizeNote);
}

export type TaskUpdatePayload = {
  name?: string;
  priority?: number;
  status?: number;
  note?: string;
  due_date?: string | null;
  project_id?: number | null;
  tags?: Tag[] | string[];
};

export async function updateTask(uid: string, payload: TaskUpdatePayload): Promise<Task> {
  return request<Task>(`/task/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createTask(payload: Record<string, unknown>): Promise<Task> {
  return request<Task>("/task", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createNote(payload: Record<string, unknown>): Promise<Note> {
  return request<Note>("/note", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Build a minimal PATCH body for status/priority changes without wiping other fields. */
export function buildTaskPatch(
  task: Task,
  changes: Partial<Pick<Task, "status" | "priority" | "note" | "due_date" | "project_id">>,
): TaskUpdatePayload {
  return {
    name: task.original_name || task.name,
    priority: changes.priority ?? task.priority,
    status: changes.status ?? task.status,
    note: changes.note ?? task.note ?? "",
    ...(changes.due_date !== undefined
      ? { due_date: changes.due_date }
      : task.due_date
        ? { due_date: task.due_date }
        : {}),
    ...(changes.project_id !== undefined
      ? { project_id: changes.project_id }
      : task.project_id
        ? { project_id: task.project_id }
        : {}),
    ...(task.tags ? { tags: task.tags } : {}),
  };
}
