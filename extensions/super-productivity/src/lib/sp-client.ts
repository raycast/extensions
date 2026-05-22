import {
  CreateTaskInput,
  ListTasksParams,
  SpEnvelope,
  SpHealth,
  SpProject,
  SpStatus,
  SpTag,
  SpTask,
  UpdateTaskInput,
} from "./sp-models";
import { SpApiError, SpConnectionError } from "./sp-errors";

export const SP_BASE_URL = "http://127.0.0.1:3876";

const REQUEST_TIMEOUT_MS = 8000;

const ALLOWED_TASK_FIELDS = new Set([
  "title",
  "notes",
  "isDone",
  "timeEstimate",
  "timeSpent",
  "projectId",
  "tagIds",
  "dueDay",
  "dueWithTime",
  "plannedAt",
]);

const toQueryString = (
  params: Record<string, string | boolean | undefined>,
): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const pickDefinedTaskFields = (
  input: Record<string, unknown>,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_TASK_FIELDS.has(key) || value === undefined || value === "") {
      continue;
    }
    payload[key] = value;
  }
  return payload;
};

const sanitizeCreateTaskInput = (
  input: CreateTaskInput,
): Record<string, unknown> => {
  const title = input.title.trim();
  if (!title) {
    throw new SpApiError("Task title is required", {
      code: "INVALID_INPUT",
      status: 400,
    });
  }

  const payload = pickDefinedTaskFields({
    title,
    notes: input.notes?.trim() || undefined,
    isDone: input.isDone,
    timeEstimate: input.timeEstimate,
    timeSpent: input.timeSpent,
    projectId: input.projectId,
    tagIds: input.tagIds?.length ? input.tagIds : undefined,
    dueDay: input.dueDay,
    dueWithTime: input.dueWithTime,
    plannedAt: input.plannedAt,
  });

  if (input.parentId) {
    delete payload.projectId;
    delete payload.tagIds;
    return { ...payload, parentId: input.parentId };
  }

  return payload;
};

const sanitizeUpdateTaskInput = (
  input: UpdateTaskInput,
): Record<string, unknown> =>
  pickDefinedTaskFields({
    title: input.title?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isDone: input.isDone,
    timeEstimate: input.timeEstimate,
    timeSpent: input.timeSpent,
    projectId: input.projectId,
    tagIds: input.tagIds?.length ? input.tagIds : undefined,
    dueDay: input.dueDay,
    dueWithTime: input.dueWithTime,
    plannedAt: input.plannedAt,
  });

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${SP_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new SpConnectionError(
      "unreachable",
      error instanceof Error
        ? error.message
        : "Unable to reach Super Productivity",
    );
  }

  let payload: SpEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as SpEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (payload && !payload.ok) {
      throw new SpApiError(payload.error.message, {
        code: payload.error.code,
        status: response.status,
        details: payload.error.details,
      });
    }

    throw new SpApiError(`Request failed with status ${response.status}`, {
      code: "HTTP_ERROR",
      status: response.status,
    });
  }

  if (!payload) {
    throw new SpApiError("Super Productivity returned an invalid response", {
      code: "INVALID_RESPONSE",
      status: response.status,
    });
  }

  if (!payload.ok) {
    throw new SpApiError(payload.error.message, {
      code: payload.error.code,
      status: response.status,
      details: payload.error.details,
    });
  }

  return payload.data;
};

export const getHealth = (): Promise<SpHealth> => request<SpHealth>("/health");

export const assertAppReady = async (): Promise<void> => {
  const health = await getHealth();
  if (!health.rendererReady) {
    throw new SpConnectionError(
      "not-ready",
      "Super Productivity renderer is not ready",
    );
  }
};

export const getStatus = (): Promise<SpStatus> => request<SpStatus>("/status");

export const getCurrentTask = (): Promise<SpTask | null> =>
  request<SpTask | null>("/task-control/current");

export const getTask = (id: string): Promise<SpTask> =>
  request<SpTask>(`/tasks/${id}`);

export const setCurrentTask = (
  taskId: string | null,
): Promise<{ currentTaskId: string | null }> =>
  request<{ currentTaskId: string | null }>("/task-control/current", {
    method: "POST",
    body: JSON.stringify({ taskId }),
  });

export const listTasks = (params: ListTasksParams = {}): Promise<SpTask[]> =>
  request<SpTask[]>(
    `/tasks${toQueryString({
      query: params.query,
      projectId: params.projectId,
      tagId: params.tagId,
      includeDone: params.includeDone,
      source: params.source,
    })}`,
  );

export const createTask = (input: CreateTaskInput): Promise<SpTask> =>
  request<SpTask>("/tasks", {
    method: "POST",
    body: JSON.stringify(sanitizeCreateTaskInput(input)),
  });

export const updateTask = (
  id: string,
  input: UpdateTaskInput,
): Promise<SpTask> =>
  request<SpTask>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(sanitizeUpdateTaskInput(input)),
  });

export const deleteTask = (
  id: string,
): Promise<{ deleted: true; id: string }> =>
  request<{ deleted: true; id: string }>(`/tasks/${id}`, { method: "DELETE" });

export const archiveTask = (
  id: string,
): Promise<{ archived: true; id: string }> =>
  request<{ archived: true; id: string }>(`/tasks/${id}/archive`, {
    method: "POST",
  });

export const restoreTask = (id: string): Promise<SpTask> =>
  request<SpTask>(`/tasks/${id}/restore`, {
    method: "POST",
  });

export const startTask = (id: string): Promise<{ currentTaskId: string }> =>
  request<{ currentTaskId: string }>(`/tasks/${id}/start`, { method: "POST" });

export const stopCurrentTask = (): Promise<{ currentTaskId: null }> =>
  request<{ currentTaskId: null }>("/task-control/stop", { method: "POST" });

export const listProjects = (query?: string): Promise<SpProject[]> =>
  request<SpProject[]>(`/projects${toQueryString({ query })}`);

export const listTags = (query?: string): Promise<SpTag[]> =>
  request<SpTag[]>(`/tags${toQueryString({ query })}`);
