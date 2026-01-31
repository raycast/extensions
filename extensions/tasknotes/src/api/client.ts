import { getPreferenceValues } from "@raycast/api";
import {
  Preferences,
  Task,
  TaskCreateInput,
  APIError,
  FilterOptions,
} from "../types";
import { setCachedTasks } from "../cache";

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getBaseUrl(): string {
  return `http://127.0.0.1:${getPreferences().apiPort}`;
}

function getAuthHeaders(): HeadersInit {
  const { apiToken } = getPreferences();
  if (apiToken) {
    return { Authorization: `Bearer ${apiToken}` };
  }
  return {};
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function createAPIError(message: string, code?: string): APIError {
  return { message, code };
}

export async function checkConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const url = `${getBaseUrl()}/api/tasks?limit=1`;
    console.log("Checking connection to:", url);
    const response = await fetch(url, { headers: getAuthHeaders() });
    console.log("Response status:", response.status);
    return {
      connected: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    console.log("Connection error:", err);
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface FetchTasksFilters {
  project?: string;
  tag?: string;
  priority?: string;
  completed?: boolean;
}

export async function fetchTasks(filters?: FetchTasksFilters): Promise<Task[]> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/tasks`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = createAPIError(
        `Failed to fetch tasks: ${response.statusText}`,
        String(response.status),
      );
      throw error;
    }

    const data = await response.json();
    let tasks = (data.data?.tasks ?? data) as Task[];

    if (filters) {
      if (filters.completed !== undefined) {
        const completedStatuses = ["done"];
        tasks = tasks.filter((t) =>
          filters.completed
            ? completedStatuses.includes(t.status)
            : !completedStatuses.includes(t.status),
        );
      }
      if (filters.project) {
        tasks = tasks.filter((t) =>
          t.projects?.some((p) => p.includes(filters.project!)),
        );
      }
      if (filters.tag) {
        tasks = tasks.filter((t) => t.tags?.includes(filters.tag!));
      }
      if (filters.priority) {
        tasks = tasks.filter((t) => t.priority === filters.priority);
      }
    }

    await setCachedTasks(tasks);
    return tasks;
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }
    throw createAPIError("Failed to fetch tasks: Network error or timeout");
  }
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  try {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = createAPIError(
        `Failed to create task: ${response.statusText}`,
        String(response.status),
      );
      throw error;
    }

    const data = await response.json();
    return (data.data?.task ?? data) as Task;
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }
    throw createAPIError("Failed to create task: Network error or timeout");
  }
}

export async function toggleTaskStatus(id: string): Promise<Task> {
  try {
    const response = await fetchWithTimeout(
      `${getBaseUrl()}/api/tasks/${id}/toggle-status`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      const error = createAPIError(
        `Failed to toggle task status: ${response.statusText}`,
        String(response.status),
      );
      throw error;
    }

    const data = await response.json();
    return (data.data?.task ?? data) as Task;
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }
    throw createAPIError(
      "Failed to toggle task status: Network error or timeout",
    );
  }
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  try {
    const response = await fetchWithTimeout(
      `${getBaseUrl()}/api/filter-options`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      const error = createAPIError(
        `Failed to fetch filter options: ${response.statusText}`,
        String(response.status),
      );
      throw error;
    }

    const data = await response.json();
    return (data.data ?? data) as FilterOptions;
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }
    throw createAPIError(
      "Failed to fetch filter options: Network error or timeout",
    );
  }
}
