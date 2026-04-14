/**
 * Cleyo API client with link-based authentication
 */

import { getAccessToken, getApiUrl } from "./auth";
import {
  Task,
  Project,
  CreateTaskRequest,
  SearchTasksParams,
  DailyPlan,
  PlanningParams,
} from "./types";

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiUrl = getApiUrl();

  // Get access token - throws if not authenticated
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated. Please connect your account first.");
  }

  const response = await fetch(`${apiUrl}/api/v1${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new Error(
      (errorData.detail as string) ||
        (errorData.message as string) ||
        `API request failed: ${response.statusText}`,
    );
  }

  // Handle empty responses (204 No Content)
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Create a new task from natural language
 */
export async function addTask(rawInput: string): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify({ raw_input: rawInput } as CreateTaskRequest),
  });
}

/**
 * Search and list tasks
 */
export async function searchTasks(
  params: SearchTasksParams = {},
): Promise<Task[]> {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/tasks?${queryString}` : "/tasks";

  // Tasks endpoint returns { tasks: [...] }
  const response = await apiRequest<{ tasks: Task[] }>(endpoint);
  return response.tasks;
}

/**
 * Get a specific task
 */
export async function getTask(taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`);
}

/**
 * Complete a task
 */
export async function completeTask(taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/complete`, {
    method: "POST",
  });
}

/**
 * Snooze a task
 */
export async function snoozeTask(taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/snooze`, {
    method: "POST",
  });
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

/**
 * List projects
 */
export async function listProjects(): Promise<Project[]> {
  // Projects endpoint returns array directly
  return apiRequest<Project[]>("/projects");
}

/**
 * Get today's daily plan
 */
export async function getTodayPlan(
  params: PlanningParams = {},
): Promise<DailyPlan> {
  const queryParams = new URLSearchParams();

  if (params.energy_level) {
    queryParams.append("energy_level", params.energy_level);
  }
  if (params.available_hours) {
    queryParams.append("available_hours", String(params.available_hours));
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `/planning/today?${queryString}`
    : "/planning/today";

  return apiRequest<DailyPlan>(endpoint);
}

/**
 * Generate a new daily plan
 */
export async function generatePlan(
  params: PlanningParams = {},
): Promise<DailyPlan> {
  return apiRequest<DailyPlan>("/planning", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export type FeedbackType =
  | "bug"
  | "feature"
  | "general"
  | "praise"
  | "complaint";

export interface FeedbackPayload {
  feedback_type: FeedbackType;
  message: string;
  rating?: number;
  user_email?: string;
  page_url?: string;
  page_title?: string;
  user_agent?: string;
  screen_size?: string;
}

/**
 * Submit feedback. Auth is optional — if the user is signed in, the token is
 * forwarded so the feedback is associated with their account.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const apiUrl = getApiUrl();
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiUrl}/api/v1/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new Error(
      (errorData.detail as string) ||
        (errorData.message as string) ||
        `Feedback submission failed: ${response.statusText}`,
    );
  }
}
