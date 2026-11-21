import { getPreferenceValues } from "@raycast/api";
import type {
  ApiErrorPayload,
  Incident,
  IncidentEvidence,
  Monitor,
  MonitorUptime,
  Paginated,
  Project,
  ProjectMonitorUptime,
  Run,
  StatusResponse,
} from "./types";

const API_BASE = "https://api.uup.dev/v1";

export class UupApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "UupApiError";
    this.status = status;
    this.code = code;
  }
}

function getApiToken(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  const trimmed = apiToken.trim();
  if (!trimmed) {
    throw new UupApiError(401, "unauthenticated", "Set your You Up? API token in Extension Preferences.");
  }
  return trimmed;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getApiToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "uupdev-raycast/1");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let code = `http_${response.status}`;
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as Partial<ApiErrorPayload>;
      if (payload.error?.code) code = payload.error.code;
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // Non-JSON error body; keep status message.
    }
    if (response.status === 403 && init.method && init.method !== "GET") {
      message = `${message} Make sure your API token has Full permissions rather than Read-only.`;
    }
    throw new UupApiError(response.status, code, message);
  }

  return (await response.json()) as T;
}

async function fetchAllPages<T>(basePath: string, params: Record<string, string | undefined> = {}): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const search = new URLSearchParams();
    search.set("limit", "200");
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        search.set(key, value);
      }
    }
    if (cursor) {
      search.set("cursor", cursor);
    }
    const page = await apiRequest<Paginated<T>>(`${basePath}?${search.toString()}`);
    items.push(...page.data);
    cursor = page.next;
    pages += 1;
  } while (cursor && pages < 10);

  return items;
}

export async function getStatus(projectId?: string): Promise<StatusResponse> {
  const query = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
  return apiRequest<StatusResponse>(`/status${query}`);
}

export async function listProjects(): Promise<Project[]> {
  return fetchAllPages<Project>("/projects");
}

export async function listMonitors(
  projectId: string,
  filters: { type?: string; state?: string; q?: string } = {},
): Promise<Monitor[]> {
  return fetchAllPages<Monitor>(`/projects/${encodeURIComponent(projectId)}/monitors`, filters);
}

export async function getMonitor(projectId: string, monitorId: string): Promise<Monitor> {
  return apiRequest<Monitor>(`/projects/${encodeURIComponent(projectId)}/monitors/${encodeURIComponent(monitorId)}`);
}

export async function getProjectUptime(projectId: string): Promise<ProjectMonitorUptime[]> {
  return fetchAllPages<ProjectMonitorUptime>(`/projects/${encodeURIComponent(projectId)}/uptime`);
}

export async function getMonitorUptime(projectId: string, monitorId: string): Promise<MonitorUptime> {
  return apiRequest<MonitorUptime>(
    `/projects/${encodeURIComponent(projectId)}/monitors/${encodeURIComponent(monitorId)}/uptime`,
  );
}

export async function listRuns(projectId: string, monitorId: string, limit = 10): Promise<Run[]> {
  const page = await apiRequest<Paginated<Run>>(
    `/projects/${encodeURIComponent(projectId)}/monitors/${encodeURIComponent(monitorId)}/runs?limit=${limit}`,
  );
  return page.data;
}

export async function listIncidents(
  projectId: string,
  filters: { open?: "true" | "false"; monitor?: string; limit?: number } = {},
): Promise<Incident[]> {
  if (filters.limit) {
    const search = new URLSearchParams({ limit: String(filters.limit) });
    if (filters.open) search.set("open", filters.open);
    if (filters.monitor) search.set("monitor", filters.monitor);
    const page = await apiRequest<Paginated<Incident>>(
      `/projects/${encodeURIComponent(projectId)}/incidents?${search.toString()}`,
    );
    return page.data;
  }
  return fetchAllPages<Incident>(`/projects/${encodeURIComponent(projectId)}/incidents`, {
    open: filters.open,
    monitor: filters.monitor,
  });
}

export async function getIncidentEvidence(projectId: string, incidentId: string): Promise<IncidentEvidence> {
  return apiRequest<IncidentEvidence>(
    `/projects/${encodeURIComponent(projectId)}/incidents/${encodeURIComponent(incidentId)}/evidence`,
  );
}

export async function acknowledgeIncident(projectId: string, incidentId: string): Promise<Incident> {
  return apiRequest<Incident>(
    `/projects/${encodeURIComponent(projectId)}/incidents/${encodeURIComponent(incidentId)}/acknowledge`,
    { method: "POST" },
  );
}

export async function resolveIncident(projectId: string, incidentId: string): Promise<Incident> {
  return apiRequest<Incident>(
    `/projects/${encodeURIComponent(projectId)}/incidents/${encodeURIComponent(incidentId)}/resolve`,
    { method: "POST" },
  );
}

export async function snoozeCheck(projectId: string, checkId: string, untilIso: string): Promise<Monitor> {
  return apiRequest<Monitor>(
    `/projects/${encodeURIComponent(projectId)}/checks/${encodeURIComponent(checkId)}/snooze`,
    {
      method: "POST",
      body: JSON.stringify({ until: untilIso }),
    },
  );
}

export async function endSnooze(projectId: string, checkId: string): Promise<Monitor> {
  return apiRequest<Monitor>(
    `/projects/${encodeURIComponent(projectId)}/checks/${encodeURIComponent(checkId)}/snooze`,
    { method: "DELETE" },
  );
}

export async function pauseMonitor(projectId: string, monitorId: string): Promise<Monitor> {
  return apiRequest<Monitor>(
    `/projects/${encodeURIComponent(projectId)}/monitors/${encodeURIComponent(monitorId)}/pause`,
    { method: "POST" },
  );
}

export async function resumeMonitor(projectId: string, monitorId: string): Promise<Monitor> {
  return apiRequest<Monitor>(
    `/projects/${encodeURIComponent(projectId)}/monitors/${encodeURIComponent(monitorId)}/resume`,
    { method: "POST" },
  );
}
