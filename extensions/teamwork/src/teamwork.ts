import { getPreferenceValues } from "@raycast/api";
import type { TeamworkTask, TeamworkTimer } from "./types";

type Included = {
  projects?: Record<string, { id?: number; name?: string }>;
  tasks?: Record<string, { id?: number; name?: string; tasklistId?: number }>;
  tasklists?: Record<
    string,
    { id?: number; name?: string; projectId?: number }
  >;
};

type TeamworkApiErrorEntry = {
  id?: string;
  title?: string;
  detail?: string;
};

type TeamworkApiErrorBody = {
  errors?: TeamworkApiErrorEntry[];
};

export class TeamworkApiError extends Error {
  status: number;
  statusText: string;
  body: string;
  errors?: TeamworkApiErrorEntry[];

  constructor(status: number, statusText: string, body: string) {
    super(`Teamwork API ${status}: ${body || statusText}`);
    this.name = "TeamworkApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;

    try {
      const parsed = JSON.parse(body) as TeamworkApiErrorBody;
      this.errors = parsed.errors;
    } catch {
      this.errors = undefined;
    }
  }
}

export function isTimerAlreadyRunningError(error: unknown): boolean {
  if (!(error instanceof TeamworkApiError) || error.status !== 403) {
    return false;
  }

  return (error.errors ?? []).some((entry) => {
    const title = (entry.title ?? "").toLowerCase();
    const detail = (entry.detail ?? "").toLowerCase();
    return (
      title.includes("forbidden") &&
      detail.includes("timer running") &&
      detail.includes("this task")
    );
  });
}

function config() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    ...preferences,
    siteUrl: normalizeSiteUrl(preferences.siteUrl),
  };
}

function normalizeSiteUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/^http:\/\//i, "https://")
    : `https://${trimmed}`;
  try {
    // Keep only the origin (scheme + host), dropping any trailing path/query/hash.
    return new URL(withScheme).origin;
  } catch {
    return withScheme.replace(/\/+$/, "");
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { siteUrl, apiToken } = config();
  const basicAuth = Buffer.from(`${apiToken}:x`).toString("base64");
  const response = await fetch(`${siteUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new TeamworkApiError(response.status, response.statusText, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function relatedName<T extends { id?: number; name?: string }>(
  items: Record<string, T> | undefined,
  id: number,
) {
  return (
    items?.[String(id)]?.name ??
    Object.values(items ?? {}).find((item) => item.id === id)?.name
  );
}

function mapRawTask(
  raw: Record<string, unknown>,
  included?: Included,
): TeamworkTask {
  const id = Number(raw.id);
  // Teamwork API omits projectId from task response; retrieve it from the tasklist instead.
  const tasklistId = Number(raw.tasklistId ?? 0);
  const tasklist = included?.tasklists?.[String(tasklistId)];
  const projectId = Number(tasklist?.projectId ?? 0);
  return {
    id,
    name: String(raw.name ?? `Task ${id}`),
    projectId,
    projectName: relatedName(included?.projects, projectId),
    tasklistName: relatedName(included?.tasklists, tasklistId),
    dueDate: typeof raw.dueDate === "string" ? raw.dueDate : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  };
}

function mapRawTimer(
  raw: Record<string, unknown>,
  included?: Included,
): TeamworkTimer {
  const taskId = Number(raw.taskId ?? 0);
  const projectId = Number(raw.projectId ?? 0);
  return {
    id: Number(raw.id),
    taskId,
    projectId,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    running: Boolean(raw.running ?? raw.isRunning),
    duration: typeof raw.duration === "number" ? raw.duration : undefined,
    lastStartedAt:
      typeof raw.lastStartedAt === "string" ? raw.lastStartedAt : undefined,
    serverTime: typeof raw.serverTime === "string" ? raw.serverTime : undefined,
    taskName: relatedName(included?.tasks, taskId),
    projectName: relatedName(included?.projects, projectId),
  };
}

let cachedUserId: number | undefined;
async function getMyUserId(): Promise<number> {
  if (cachedUserId) return cachedUserId;
  const data = await request<{
    person?: { id?: number | string };
    id?: number | string;
  }>("/projects/api/v3/me.json");
  cachedUserId = Number(data.person?.id ?? data.id ?? 0) || undefined;
  return cachedUserId ?? 0;
}

export async function fetchTask(
  taskId: number,
): Promise<TeamworkTask | undefined> {
  const params = new URLSearchParams({
    include: "projects,tasklists",
    "fields[tasks]": "id,projectId,tasklistId,name,status,dueDate",
    "fields[tasklists]": "id,projectId,name",
  });
  const data = await request<{
    task?: Record<string, unknown>;
    included?: Included;
  }>(`/projects/api/v3/tasks/${taskId}.json?${params}`);
  const raw = data.task;
  if (!raw) return undefined;
  return mapRawTask(raw, data.included);
}

export async function searchTasks(
  searchTerm = "",
  completed = false,
): Promise<TeamworkTask[]> {
  const params = new URLSearchParams({
    includeCompletedTasks: completed ? "true" : "false",
    include: "projects,tasklists,tasks.tasklists",
    "fields[tasks]": "id,projectId,tasklistId,name,status,dueDate",
    "fields[tasklists]": "id,projectId,name",
    pageSize: "100",
    orderBy: "dateUpdated",
    orderMode: "desc",
  });
  const userId = await getMyUserId();
  if (userId) params.set("responsiblePartyIds", String(userId));
  if (searchTerm.trim()) params.set("searchTerm", searchTerm.trim());

  const data = await request<{
    tasks?: Array<Record<string, unknown>>;
    included?: Included;
  }>(`/projects/api/v3/tasks.json?${params}`);

  const tasks = (data.tasks ?? []).map((raw) => mapRawTask(raw, data.included));

  return tasks.filter((task) =>
    completed ? task.status === "completed" : task.status !== "completed",
  );
}

export async function getRunningTimer(): Promise<TeamworkTimer | undefined> {
  const params = new URLSearchParams({
    include:
      "projects,projects.companies,tasks,tasks.tasklists,tasks.parentTasks",
    "fields[tasks]": "tasklistId,parentTaskId,name",
    "fields[projects]": "name,companyId",
    skipCounts: "true",
    limit: "10",
    pageSize: "10",
  });
  const data = await request<{
    timers?: Array<Record<string, unknown>>;
    included?: Included;
  }>(`/projects/api/v3/me/timers.json?${params}`);

  const raw = (data.timers ?? []).find(
    (timer) => timer.running === true || timer.isRunning === true,
  );
  if (!raw) return undefined;

  return mapRawTimer(raw, data.included);
}

export type TimerState = {
  running?: TeamworkTimer;
  paused: TeamworkTimer[];
};

export async function getTimerState(): Promise<TimerState> {
  const params = new URLSearchParams({
    include:
      "projects,projects.companies,tasks,tasks.tasklists,tasks.parentTasks",
    "fields[tasks]": "tasklistId,parentTaskId,name",
    "fields[projects]": "name,companyId",
    skipCounts: "true",
    pageSize: "50",
  });
  const data = await request<{
    timers?: Array<Record<string, unknown>>;
    included?: Included;
  }>(`/projects/api/v3/me/timers.json?${params}`);

  const timers = data.timers ?? [];
  const running = timers.find(
    (t) => t.running === true || t.isRunning === true,
  );
  const paused = timers.filter(
    (t) => t.running !== true && t.isRunning !== true,
  );

  return {
    running: running ? mapRawTimer(running, data.included) : undefined,
    paused: paused.map((timer) => mapRawTimer(timer, data.included)),
  };
}

async function getAllTimers(): Promise<Array<Record<string, unknown>>> {
  const params = new URLSearchParams({
    include:
      "projects,projects.companies,tasks,tasks.tasklists,tasks.parentTasks",
    "fields[tasks]": "tasklistId,parentTaskId,name",
    "fields[projects]": "name,companyId",
    skipCounts: "true",
    pageSize: "100",
  });
  const data = await request<{
    timers?: Array<Record<string, unknown>>;
  }>(`/projects/api/v3/me/timers.json?${params}`);

  return data.timers ?? [];
}

export async function startTimer(task: TeamworkTask): Promise<void> {
  // Check if there's a paused timer for this task and resume it
  const allTimers = await getAllTimers();
  const pausedTimer = allTimers.find(
    (timer) =>
      Number(timer.taskId) === task.id &&
      (timer.running === false || timer.isRunning === false),
  );

  if (pausedTimer) {
    await resumeTimer(Number(pausedTimer.id));
  } else {
    await request("/projects/api/v3/me/timers.json", {
      method: "POST",
      body: JSON.stringify({
        timer: {
          projectId: task.projectId,
          taskId: task.id,
        },
      }),
    });
  }
}

export async function pauseTimer(timerId: number): Promise<void> {
  await request(`/projects/api/v3/me/timers/${timerId}/pause.json`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function resumeTimer(timerId: number): Promise<void> {
  await request(`/projects/api/v3/me/timers/${timerId}/resume.json`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function completeTimer(timer: TeamworkTimer): Promise<void> {
  await request(`/projects/api/v3/me/timers/${timer.id}/complete.json`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export function taskUrl(taskId: number): string {
  return `${config().siteUrl}/app/tasks/${taskId}`;
}

export function formatElapsed(timer: TeamworkTimer): string {
  let seconds = Math.max(0, timer.duration ?? 0);
  if (timer.running && timer.lastStartedAt) {
    const now = timer.serverTime ? Date.parse(timer.serverTime) : Date.now();
    const started = Date.parse(timer.lastStartedAt);
    if (Number.isFinite(now) && Number.isFinite(started))
      seconds += Math.max(0, Math.floor((now - started) / 1000));
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0
    ? `${hours}h ${minutes.toString().padStart(2, "0")}m`
    : `${minutes}m`;
}
