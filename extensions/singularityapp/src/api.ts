import { Icon, LocalStorage, showToast, Toast, Color } from "@raycast/api";

export const API_TOKEN_KEY = "singularity-api-token";
export const MAX_COUNT_KEY = "singularity-max-count";
export const DEFAULT_MAX_COUNT = 3000;
const API_BASE_URL = "https://api.singularity-app.com";

export function getAPIDateString(date: Date): string {
  return date.toISOString();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public statusText?: string,
    public responseBody?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get userFriendlyMessage(): string {
    const statusInfo = this.statusCode ? `[${this.statusCode} ${this.statusText || ""}] ` : "";
    const responseInfo = this.responseBody ? `\nResponse: ${this.responseBody}` : "";

    if (this.statusCode === 400) {
      return `${statusInfo}Bad request. Please check the data you are sending to the server.${responseInfo}`;
    }
    if (this.statusCode === 401) {
      return `${statusInfo}Authentication failed. Please check your API token.${responseInfo}`;
    }
    if (this.statusCode === 403) {
      return `${statusInfo}Access denied. Your API token may not have the required permissions.${responseInfo}`;
    }
    if (this.statusCode === 404) {
      return `${statusInfo}Resource not found. The API endpoint may have changed.${responseInfo}`;
    }
    if (this.statusCode === 429) {
      return `${statusInfo}Too many requests. Please wait a moment and try again.${responseInfo}`;
    }
    if (this.statusCode && this.statusCode >= 500) {
      return `${statusInfo}Server error. SingularityApp service may be temporarily unavailable.${responseInfo}`;
    }
    if (this.message.includes("fetch")) {
      return `Network error. Please check your internet connection. ${this.message}`;
    }
    return `${statusInfo}${this.message}${responseInfo}`;
  }
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = (await response.json()) as Record<string, unknown>;
      const message = json.message || json.error;
      return typeof message === "string" ? message : JSON.stringify(json);
    }
    return await response.text();
  } catch {
    return response.statusText || "Unknown error";
  }
}

export async function getApiToken(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(API_TOKEN_KEY);
}

export async function getMaxCount(): Promise<number> {
  const stored = await LocalStorage.getItem<number>(MAX_COUNT_KEY);
  return stored ?? DEFAULT_MAX_COUNT;
}

export async function setMaxCount(value: number): Promise<void> {
  await LocalStorage.setItem(MAX_COUNT_KEY, value);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getApiToken();
  if (!token) {
    throw new ApiError("API token not set. Please use 'Set API Token' command first.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: number;
  journalDate?: string;
  completeLast?: string;
  complete: number;
  checked: number;
  start?: string;
  deadline?: string;
  projectId?: string;
  useTime?: boolean;
  timeLength?: number;
  removed?: boolean;
  tags?: string[];
}

export interface TaskCreateParams {
  title: string;
  note?: string;
  priority?: number; // 0: High, 1: Normal, 2: Low
  journalDate?: string;
  start?: string;
  deadline?: string;
  projectId?: string;
  useTime?: boolean;
  tags?: string[];
}

export interface TaskListResponse {
  tasks: Task[];
}

export interface Project {
  id: string;
  title: string;
  emoji?: string;
  color?: string;
}

export interface ProjectListResponse {
  projects: Project[];
}

export interface Note {
  id: string;
  text?: string;
  content?: string;
  delta?: unknown;
}

export async function createTask(params: TaskCreateParams): Promise<Task> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/v2/task`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    throw new ApiError(`Failed to create task: ${errorBody}`, response.status, response.statusText, errorBody);
  }

  return (await response.json()) as Task;
}

export async function getTasks(params?: {
  startDateFrom?: string;
  startDateTo?: string;
  projectId?: string;
  includeRemoved?: boolean;
  includeArchived?: boolean;
  includeAllRecurrenceInstances?: boolean;
  maxCount?: number;
}): Promise<Task[]> {
  const headers = await getAuthHeaders();

  const queryParams = new URLSearchParams();
  if (params?.projectId) queryParams.append("projectId", params.projectId);
  if (params?.includeRemoved !== undefined) queryParams.append("includeRemoved", String(params.includeRemoved));
  if (params?.maxCount) queryParams.append("maxCount", String(params.maxCount));
  if (params?.includeArchived !== undefined) queryParams.append("includeArchived", String(params.includeArchived));
  if (params?.startDateFrom) queryParams.append("startDateFrom", params.startDateFrom);
  if (params?.startDateTo) queryParams.append("startDateTo", params.startDateTo);
  if (params?.includeAllRecurrenceInstances)
    queryParams.append("includeAllRecurrenceInstances", String(params.includeAllRecurrenceInstances));

  const url = `${API_BASE_URL}/v2/task${queryParams.toString() ? `?${queryParams}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    throw new ApiError(`Failed to fetch tasks: ${errorBody}`, response.status, response.statusText, errorBody);
  }

  const data = (await response.json()) as TaskListResponse;
  return data.tasks;
}

export async function getTasksForToday(): Promise<Task[]> {
  const today = new Date();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const maxCount = await getMaxCount();

  const tasks = await getTasks({
    startDateTo: endOfDay.toISOString(),
    includeRemoved: false,
    includeArchived: false,
    maxCount,
  });

  return tasks;
}

export async function getInboxTasks(): Promise<Task[]> {
  const maxCount = await getMaxCount();
  const tasks = await getTasks({
    includeRemoved: false,
    includeArchived: false,
    maxCount,
  });

  // Inbox tasks are those without a project assigned and without a date scheduled
  return tasks.filter((task) => !task.projectId && !task.start);
}

export async function getUpcomingTasks(): Promise<Task[]> {
  const today = new Date();
  const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);
  const maxCount = await getMaxCount();

  const tasks = await getTasks({
    startDateFrom: startOfTomorrow.toISOString(),
    includeRemoved: false,
    includeArchived: false,
    maxCount,
  });

  return tasks;
}

export async function getCompletedTasks(): Promise<Task[]> {
  const maxCount = await getMaxCount();
  const tasks = await getTasks({
    includeRemoved: false,
    includeArchived: true,
    includeAllRecurrenceInstances: true,
    maxCount,
  });

  // Filter to only include completed tasks
  return tasks.filter((task) => task.checked === 1 || task.complete === 1);
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const maxCount = await getMaxCount();
  const tasks = await getTasks({
    projectId,
    includeRemoved: false,
    includeArchived: false,
    maxCount,
  });

  return tasks;
}

export interface TaskUpdateParams {
  title?: string;
  note?: string;
  priority?: number;
  start?: string | null;
  deadline?: string | null;
  projectId?: string | null;
  journalDate?: string | null;
  checked?: number;
  complete?: number;
  tags?: string[];
}

export async function updateTask(taskId: string, params: TaskUpdateParams): Promise<Task> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/v2/task/${taskId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    throw new ApiError(`Failed to update task: ${errorBody}`, response.status, response.statusText, errorBody);
  }

  return (await response.json()) as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/v2/task/${taskId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    throw new ApiError(`Failed to delete task: ${errorBody}`, response.status, response.statusText, errorBody);
  }
}

export async function completeTask(taskId: string): Promise<Task> {
  return updateTask(taskId, { checked: 1, journalDate: new Date().toISOString() });
}

export async function uncompleteTask(taskId: string): Promise<Task> {
  return updateTask(taskId, { checked: 0, journalDate: null });
}

export async function getNote(noteId: string): Promise<Note | null> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE_URL}/v2/note/${noteId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      // Note endpoint might not exist or note not found
      return null;
    }

    return (await response.json()) as Note;
  } catch {
    // If note fetching fails, return null silently
    return null;
  }
}

export async function getProjects(): Promise<Project[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/v2/project`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    throw new ApiError(`Failed to fetch projects: ${errorBody}`, response.status, response.statusText, errorBody);
  }

  const data = (await response.json()) as ProjectListResponse;
  return data.projects;
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorTitle: string,
  options?: { showDetails?: boolean },
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    let message: string;
    let primaryAction: Toast.ActionOptions | undefined;

    if (error instanceof ApiError) {
      message = error.userFriendlyMessage;
      if (options?.showDetails && error.responseBody) {
        primaryAction = {
          title: "Copy Error Details",
          onAction: async (toast) => {
            const { Clipboard } = await import("@raycast/api");
            await Clipboard.copy(
              `Status: ${error.statusCode}\nMessage: ${error.message}\nResponse: ${error.responseBody}`,
            );
            toast.hide();
          },
        };
      }
    } else if (error instanceof Error) {
      message = error.message;
      if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        message = "Network error. Please check your internet connection.";
      }
    } else {
      message = "An unexpected error occurred";
    }

    await showToast({
      style: Toast.Style.Failure,
      title: errorTitle,
      message,
      primaryAction,
    });
    return null;
  }
}

export function getProjectIcon(
  project: Project | undefined,
  preferEmoji: boolean = false,
): { source: Icon; tintColor?: Color } {
  if (project) {
    if (project.emoji) {
      const icon = String.fromCodePoint(parseInt(project.emoji, 16));
      return { source: icon as Icon };
    } else {
      if (preferEmoji) {
        return { source: "○" as Icon };
      }
      return { source: Icon.Circle, tintColor: project.color ? (project.color as Color) : undefined };
    }
  }
  if (preferEmoji) {
    return { source: "○" as Icon };
  }
  return { source: Icon.Circle };
}
