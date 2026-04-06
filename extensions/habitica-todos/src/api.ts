import { getPreferenceValues } from "@raycast/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HabiticaTask {
  id: string;
  _id: string;
  text: string;
  type: "habit" | "daily" | "todo" | "reward";
  notes: string;
  priority: number;
  date: string | null;
  completed: boolean;
  checklist: { id: string; text: string; completed: boolean }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  value: number;
}

export interface HabiticaTag {
  id: string;
  name: string;
}

export interface CreateTaskBody {
  text: string;
  type: string;
  notes?: string;
  priority?: number;
  date?: string;
  tags?: string[];
}

export interface UpdateTaskBody {
  text?: string;
  notes?: string;
  priority?: number;
  date?: string;
}

interface HabiticaResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const BASE_URL = "https://habitica.com";

function getHeaders(): Record<string, string> {
  const { apiUserId, apiToken } = getPreferenceValues<Preferences>();
  return {
    "Content-Type": "application/json",
    "x-api-user": apiUserId,
    "x-api-key": apiToken,
    "x-client": `${apiUserId}-RaycastExtension`,
  };
}

async function habiticaFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });

  const json = (await res.json()) as HabiticaResponse<T>;

  if (!json.success) {
    throw new Error(json.message || `Habitica API error on ${path}`);
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTasks(type?: string): Promise<HabiticaTask[]> {
  const query = type ? `?type=${type}` : "";
  return habiticaFetch<HabiticaTask[]>(`/api/v3/tasks/user${query}`);
}

export async function getTags(): Promise<HabiticaTag[]> {
  return habiticaFetch<HabiticaTag[]>("/api/v3/tags");
}

export async function createTask(body: CreateTaskBody): Promise<HabiticaTask> {
  return habiticaFetch<HabiticaTask>("/api/v3/tasks/user", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTask(taskId: string, body: UpdateTaskBody): Promise<HabiticaTask> {
  return habiticaFetch<HabiticaTask>(`/api/v3/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function scoreTask(taskId: string, direction: "up" | "down"): Promise<unknown> {
  return habiticaFetch(`/api/v3/tasks/${taskId}/score/${direction}`, {
    method: "POST",
  });
}

export async function deleteTask(taskId: string): Promise<unknown> {
  return habiticaFetch(`/api/v3/tasks/${taskId}`, {
    method: "DELETE",
  });
}
