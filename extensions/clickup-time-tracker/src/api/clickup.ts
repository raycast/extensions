import { getPreferenceValues } from "@raycast/api";
import {
  User,
  Task,
  TimeEntry,
  UserResponse,
  TasksResponse,
  TimeEntriesResponse,
  CurrentTimeEntry,
  StartTimeEntryResponse,
  StopTimeEntryResponse,
} from "../types/clickup";

interface Preferences {
  apiToken: string;
  teamId: string;
}

const BASE_URL = "https://api.clickup.com/api/v2";

function getHeaders(): HeadersInit {
  const { apiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: apiToken,
    "Content-Type": "application/json",
  };
}

function getTeamId(): string {
  const { teamId } = getPreferenceValues<Preferences>();
  return teamId;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.err || errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`ClickUp API Error (${response.status}): ${errorMessage}`);
  }

  return response.json() as Promise<T>;
}

export async function getAuthorizedUser(): Promise<User> {
  const response = await fetchApi<UserResponse>("/user");
  return response.user;
}

export async function getTasks(assigneeId?: number): Promise<Task[]> {
  const teamId = getTeamId();
  let endpoint = `/team/${teamId}/task?subtasks=true&include_closed=false`;

  if (assigneeId) {
    endpoint += `&assignees[]=${assigneeId}`;
  }

  const response = await fetchApi<TasksResponse>(endpoint);
  return response.tasks;
}

export async function startTimeEntry(
  taskId: string,
  description?: string,
): Promise<TimeEntry> {
  const teamId = getTeamId();
  const body: Record<string, unknown> = {
    tid: taskId,
  };

  if (description) {
    body.description = description;
  }

  const response = await fetchApi<StartTimeEntryResponse>(
    `/team/${teamId}/time_entries/start`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return response.data;
}

export async function stopTimeEntry(): Promise<TimeEntry> {
  const teamId = getTeamId();
  const response = await fetchApi<StopTimeEntryResponse>(
    `/team/${teamId}/time_entries/stop`,
    {
      method: "POST",
    },
  );

  return response.data;
}

export async function getCurrentTimeEntry(): Promise<TimeEntry | null> {
  const teamId = getTeamId();
  const response = await fetchApi<CurrentTimeEntry>(
    `/team/${teamId}/time_entries/current`,
  );
  return response.data;
}

export async function getTimeEntries(
  startDate?: number,
  endDate?: number,
): Promise<TimeEntry[]> {
  const teamId = getTeamId();
  let endpoint = `/team/${teamId}/time_entries`;

  const params: string[] = [];
  if (startDate) {
    params.push(`start_date=${startDate}`);
  }
  if (endDate) {
    params.push(`end_date=${endDate}`);
  }

  if (params.length > 0) {
    endpoint += `?${params.join("&")}`;
  }

  const response = await fetchApi<TimeEntriesResponse>(endpoint);
  return response.data || [];
}

export function formatDuration(durationMs: number): string {
  const isNegative = durationMs < 0;
  const absDuration = Math.abs(durationMs);

  const hours = Math.floor(absDuration / 3600000);
  const minutes = Math.floor((absDuration % 3600000) / 60000);
  const seconds = Math.floor((absDuration % 60000) / 1000);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);

  const formatted = parts.join(" ");
  return isNegative ? `Running: ${formatted}` : formatted;
}

export function formatDate(timestamp: string): string {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(timestamp: string): string {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
