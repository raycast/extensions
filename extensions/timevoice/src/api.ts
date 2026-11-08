import { LaunchType, OAuth, getPreferenceValues, launchCommand } from "@raycast/api";
import { OAuthService, getAccessToken } from "@raycast/utils";

// The public (PKCE) OAuth application registered on timevoice.mahadk.com.
const TIMEVOICE_CLIENT_ID = "dizWuONAZf9JSgIlfkrTg90w-CJfiqcQGRwrzglsiks";

const { clientId, baseUrl: rawBaseUrl, workspaceId: preferredWorkspaceId } = getPreferenceValues<Preferences>();
export const baseUrl = (rawBaseUrl || "https://timevoice.mahadk.com").replace(/\/+$/, "");

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Timevoice",
  providerIcon: "icon.png",
  description: "Connect your Timevoice account to track time from Raycast.",
});

export const timevoice = new OAuthService({
  client,
  clientId: clientId || TIMEVOICE_CLIENT_ID,
  scope: "read time_entries",
  authorizeUrl: `${baseUrl}/oauth/authorize`,
  tokenUrl: `${baseUrl}/oauth/token`,
  bodyEncoding: "url-encoded",
});

export type Project = {
  id: string;
  name: string;
  color: string;
  billable_default: boolean;
  client: { id: string; name: string } | null;
};

export type Tag = { id: string; name: string };

export type TimeEntry = {
  id: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  billable: boolean;
  project: { id: string; name: string; color: string } | null;
  tags: Tag[];
};

export type EntryInput = {
  description?: string;
  project_id?: string;
  billable?: boolean;
  tag_ids?: string[];
  started_at?: string;
  ended_at?: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = getAccessToken();
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 401) {
    await client.removeTokens();
    throw new Error("Your Timevoice session expired. Run the command again to reconnect.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string; error_description?: string };
    throw new Error(body.message || body.error_description || `Timevoice returned ${response.status}`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

let workspaceId: Promise<string> | undefined;

export function getWorkspaceId(): Promise<string> {
  if (preferredWorkspaceId) return Promise.resolve(preferredWorkspaceId);

  workspaceId ??= request<{ id: string }[]>("/workspaces").then((workspaces) => {
    if (!workspaces[0]) throw new Error("Your Timevoice account has no workspace.");
    return workspaces[0].id;
  });
  return workspaceId;
}

async function workspaceRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`/${await getWorkspaceId()}${path}`, init);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Without `days`, lists every entry: API v1 has no "running" filter, and a timer can run for any length of time.
export function listEntries(days?: number): Promise<TimeEntry[]> {
  return workspaceRequest(days === undefined ? "/time_entries" : `/time_entries?start_date=${daysAgo(days)}`);
}

export async function getRunningEntries(): Promise<TimeEntry[]> {
  return (await listEntries()).filter((entry) => !entry.ended_at);
}

export function listProjects(): Promise<Project[]> {
  return workspaceRequest("/projects");
}

export function listTags(): Promise<Tag[]> {
  return workspaceRequest("/tags");
}

export function stopEntry(id: string): Promise<TimeEntry> {
  return workspaceRequest(`/time_entries/${id}/stop`, { method: "PATCH" });
}

// Matches the web app: starting a timer stops the one already running.
export async function startTimer(input: EntryInput): Promise<TimeEntry> {
  await Promise.all((await getRunningEntries()).map((entry) => stopEntry(entry.id)));
  return workspaceRequest("/time_entries/start", { method: "POST", body: JSON.stringify(input) });
}

export function createEntry(input: EntryInput): Promise<TimeEntry> {
  return workspaceRequest("/time_entries", { method: "POST", body: JSON.stringify(input) });
}

export function deleteEntry(id: string): Promise<void> {
  return workspaceRequest(`/time_entries/${id}`, { method: "DELETE" });
}

export async function timerUrl(): Promise<string> {
  return `${baseUrl}/${await getWorkspaceId()}/timer`;
}

export function elapsedSeconds(entry: TimeEntry): number {
  if (entry.duration_seconds != null) return entry.duration_seconds;
  return Math.max(0, Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000));
}

export function formatDuration(seconds: number, withSeconds = true): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const mm = String(minutes).padStart(2, "0");
  if (!withSeconds) return `${hours}:${mm}`;
  return `${hours}:${mm}:${String(secs).padStart(2, "0")}`;
}

export function continueInput(entry: TimeEntry): EntryInput {
  return {
    description: entry.description ?? undefined,
    project_id: entry.project?.id,
    billable: entry.billable,
    tag_ids: entry.tags.map((tag) => tag.id),
  };
}

// Redraws the menu bar timer right away instead of on its next 1-minute tick.
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "running-timer", type: LaunchType.Background });
  } catch {
    // The menu bar command is disabled.
  }
}
