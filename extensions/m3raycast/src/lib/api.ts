import { getPreferenceValues } from "@raycast/api";
import {
  ListClientsResponse,
  CheckClientResponse,
  CreateClientResponse,
  ListProjectsResponse,
  ListCategoriesResponse,
  CreateProjectResponse,
  ListMembersResponse,
  ListTimersResponse,
  StartTimerResponse,
  StopTimerResponse,
  ListFirewallsResponse,
  WhitelistIPResponse,
} from "./types";

interface Preferences {
  apiUrl: string;
  apiToken: string;
  username: string;
}

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getHeaders(): HeadersInit {
  const { apiToken } = getPreferences();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

function getBaseUrl(): string {
  const { apiUrl } = getPreferences();
  return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Client API
// ═══════════════════════════════════════════════════════════════════════════════

export async function listClients(search?: string): Promise<ListClientsResponse> {
  const url = new URL(`${getBaseUrl()}/api/raycast/clients/`);
  if (search) {
    url.searchParams.set("search", search);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<ListClientsResponse>(response);
}

export async function checkClientExists(name: string): Promise<CheckClientResponse> {
  const url = new URL(`${getBaseUrl()}/api/raycast/clients/check/`);
  url.searchParams.set("name", name);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<CheckClientResponse>(response);
}

export async function createClient(data: {
  name: string;
  legal_name?: string;
  status?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
}): Promise<CreateClientResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/clients/create/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<CreateClientResponse>(response);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Project API
// ═══════════════════════════════════════════════════════════════════════════════

export async function listProjects(options?: {
  client_id?: number;
  include_completed?: boolean;
  search?: string;
}): Promise<ListProjectsResponse> {
  const url = new URL(`${getBaseUrl()}/api/raycast/projects/`);

  if (options?.client_id) {
    url.searchParams.set("client_id", options.client_id.toString());
  }
  if (options?.include_completed) {
    url.searchParams.set("include_completed", "true");
  }
  if (options?.search) {
    url.searchParams.set("search", options.search);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<ListProjectsResponse>(response);
}

export async function listProjectCategories(): Promise<ListCategoriesResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/projects/categories/`, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<ListCategoriesResponse>(response);
}

export async function createProject(data: {
  client_id: number;
  description: string;
  category_id?: number;
  category_name?: string;
  rate?: number;
  discounted_rate?: number;
  estimated_price?: number;
  request_method?: string;
  start_timer?: boolean;
  member_id?: number;
}): Promise<CreateProjectResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/projects/create/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<CreateProjectResponse>(response);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Member API
// ═══════════════════════════════════════════════════════════════════════════════

export async function listMembers(): Promise<ListMembersResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/members/`, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<ListMembersResponse>(response);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Timer API
// ═══════════════════════════════════════════════════════════════════════════════

export async function listRunningTimers(username?: string): Promise<ListTimersResponse> {
  const url = new URL(`${getBaseUrl()}/api/raycast/timers/`);
  if (username) {
    url.searchParams.set("username", username);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<ListTimersResponse>(response);
}

export async function startTimer(data: {
  project_id: number;
  username: string;
  note?: string;
}): Promise<StartTimerResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/timers/start/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<StartTimerResponse>(response);
}

export async function stopTimer(eventId: number): Promise<StopTimerResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/timers/stop/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ event_id: eventId }),
  });

  return handleResponse<StopTimerResponse>(response);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

export function getUsername(): string {
  const { username } = getPreferences();
  return username;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Firewall API
// ═══════════════════════════════════════════════════════════════════════════════

export async function listFirewalls(): Promise<ListFirewallsResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/firewalls/`, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<ListFirewallsResponse>(response);
}

export async function whitelistIP(data: { firewall_ids: string[]; ports?: string[] }): Promise<WhitelistIPResponse> {
  const response = await fetch(`${getBaseUrl()}/api/raycast/firewalls/whitelist/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<WhitelistIPResponse>(response);
}
