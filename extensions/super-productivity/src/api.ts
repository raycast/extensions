import { getPreferenceValues, showToast, showHUD, Toast } from "@raycast/api";
import type {
  ApiResponse,
  ApiError,
  Task,
  Project,
  Tag,
  CurrentTask,
  StatusResponse,
  HealthResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskQueryParams,
  CreateTagPayload,
  UpdateTagPayload,
} from "./types";

function getBaseUrl(): string {
  const { apiBaseUrl } = getPreferenceValues<Preferences>();
  return (apiBaseUrl || "http://127.0.0.1:3876").trim().replace(/\/+$/, "");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { accessToken } = getPreferenceValues<Preferences>();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(url, {
      headers,
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorBody}`);
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    const json = (await res.json()) as ApiResponse<T> | ApiError;

    if (!json.ok) {
      throw new Error(json.error.message);
    }

    return json.data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("connect")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection failed",
          message: "Make sure Super Productivity is running and the Local REST API is enabled in Settings → Misc.",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Error",
          message: error.message,
        });
      }
    }
    throw error;
  }
}

// ─── Health ────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

// ─── Tasks ────────────────────────────────────────────────

export async function getTasks(params?: TaskQueryParams): Promise<Task[]> {
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.set("query", params.query);
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.tagId) searchParams.set("tagId", params.tagId);
  if (params?.includeDone) searchParams.set("includeDone", "true");
  if (params?.source) searchParams.set("source", params.source);
  const qs = searchParams.toString();
  return request<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
}

export async function getTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`);
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const task = await request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (payload.isDone === true) {
    await showHUD("✅ Task completed — focus session ends if enabled in SP");
  }
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, { method: "DELETE" });
}

export async function startTask(id: string): Promise<void> {
  await request<void>(`/tasks/${id}/start`, { method: "POST" });
  await showHUD("▶️ Task started — focus session starts if enabled in SP");
}

export async function archiveTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}/archive`, { method: "POST" });
}

export async function restoreTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}/restore`, { method: "POST" });
}

// ─── Task Control ─────────────────────────────────────────

export async function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>("/status");
}

export async function getCurrentTask(): Promise<CurrentTask | null> {
  return request<CurrentTask | null>("/task-control/current");
}

export async function setCurrentTask(taskId: string | null): Promise<void> {
  await request<void>("/task-control/current", {
    method: "POST",
    body: JSON.stringify({ taskId }),
  });
  await showHUD(
    taskId
      ? "▶️ Task started — focus session starts if enabled in SP"
      : "⏹ Task stopped — focus session ends if enabled in SP",
  );
}

export async function stopCurrentTask(): Promise<void> {
  await request<void>("/task-control/stop", { method: "POST" });
  await showHUD("⏹ Task stopped — focus session ends if enabled in SP");
}

// ─── Projects ─────────────────────────────────────────────

export async function getProjects(query?: string): Promise<Project[]> {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  return request<Project[]>(`/projects${qs}`);
}

// ─── Tags ─────────────────────────────────────────────────

export async function getTags(query?: string): Promise<Tag[]> {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  return request<Tag[]>(`/tags${qs}`);
}

export async function createTag(payload: CreateTagPayload): Promise<Tag> {
  return request<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTag(id: string, payload: UpdateTagPayload): Promise<Tag> {
  return request<Tag>(`/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTag(id: string): Promise<void> {
  return request<void>(`/tags/${id}`, { method: "DELETE" });
}
