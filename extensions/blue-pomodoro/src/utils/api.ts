import { getPreferenceValues } from "@raycast/api";

export type ProfileData = {
  id: string;
  display_name: string;
  email: string;
  timezone: string;
  puntos_totales: number;
  streak_days: number;
  pomodoro: {
    work_minutes: number;
    break_minutes: number;
    long_break_after: number;
    long_break_threshold: number;
    long_break_minutes_high: number;
    long_break_minutes_low: number;
    overtime_grace_seconds: number;
  };
  stats: {
    work_sessions: number;
    break_sessions: number;
    focus_minutes: number;
    break_minutes: number;
    overtime_minutes: number;
    tasks_completed: number;
    tasks_created: number;
  };
};

export type TaskData = {
  id: string;
  title: string;
  status: "Pendiente" | "En Proceso" | "Completada";
  effort_estimated: number;
  pomodoros_completed: number;
  created_at: string;
  due_date: string | null;
  priority: string | null;
};

type Preferences = {
  apiToken: string;
  baseUrl: string;
};

function getApiConfig() {
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.baseUrl.replace(/\/$/, ""); // Strip trailing slash
  return {
    baseUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prefs.apiToken}`,
    },
  };
}

export async function fetchProfile(): Promise<ProfileData> {
  const { baseUrl, headers } = getApiConfig();
  const res = await fetch(`${baseUrl}/api/integration/profile`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to fetch profile");
  }
  return res.json() as Promise<ProfileData>;
}

export async function fetchTasks(): Promise<TaskData[]> {
  const { baseUrl, headers } = getApiConfig();
  const res = await fetch(`${baseUrl}/api/integration/tasks`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to fetch tasks");
  }
  const data = (await res.json()) as { tasks: TaskData[] };
  return data.tasks;
}

export async function createTask(
  title: string,
  priority?: string,
  effort?: number,
): Promise<TaskData> {
  const { baseUrl, headers } = getApiConfig();
  const res = await fetch(`${baseUrl}/api/integration/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, priority, effort_estimated: effort }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to create task");
  }
  const data = (await res.json()) as { task: TaskData };
  return data.task;
}

export async function updateTask(
  id: string,
  updates: {
    status?: "Pendiente" | "En Proceso" | "Completada";
    effort_estimated?: number;
    pomodoros_completed?: number;
    title?: string;
    priority?: string;
  },
): Promise<TaskData> {
  const { baseUrl, headers } = getApiConfig();
  const res = await fetch(`${baseUrl}/api/integration/tasks`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to update task");
  }
  const data = (await res.json()) as { task: TaskData };
  return data.task;
}

export async function logPomodoroSession(params: {
  mode: "work" | "break";
  started_at: string;
  duration_sec: number;
  overtime_sec?: number;
  task_id?: string;
}): Promise<{
  session: unknown;
  profile: { puntos_totales: number; streak_days: number };
}> {
  const { baseUrl, headers } = getApiConfig();
  const res = await fetch(`${baseUrl}/api/integration/pomodoro`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to log pomodoro session");
  }
  return res.json() as Promise<{
    session: unknown;
    profile: { puntos_totales: number; streak_days: number };
  }>;
}
