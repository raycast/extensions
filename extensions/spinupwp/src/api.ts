import { Server, Site, Event, ApiResponse, EventResponse } from "./types";
import { getActiveToken } from "./accounts";
import { isDemoMode, mockServers, mockSites, mockEvents } from "./mock-data";

const BASE_URL = "https://api.spinupwp.app/v1";

// Demo mode helper - returns a fake event response
function mockEventResponse(): EventResponse {
  return { event_id: Math.floor(Math.random() * 10000) };
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await getActiveToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function getServers(): Promise<Server[]> {
  if (isDemoMode()) return mockServers;

  const allServers: Server[] = [];
  let nextPage: string | null = `${BASE_URL}/servers`;
  const headers = await getHeaders();

  while (nextPage) {
    const response: Response = await fetch(nextPage, {
      method: "GET",
      headers,
    });

    const result: ApiResponse<Server[]> = await handleResponse<ApiResponse<Server[]>>(response);
    allServers.push(...result.data);
    nextPage = result.pagination?.next || null;
  }

  return allServers;
}

export async function rebootServer(serverId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/servers/${serverId}/reboot`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function restartNginx(serverId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/servers/${serverId}/services/nginx/restart`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function restartRedis(serverId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/servers/${serverId}/services/redis/restart`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function restartPhp(serverId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/servers/${serverId}/services/php/restart`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function restartMysql(serverId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/servers/${serverId}/services/mysql/restart`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function getEvent(eventId: number): Promise<Event> {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: "GET",
    headers,
  });

  const result = await handleResponse<ApiResponse<Event>>(response);
  return result.data;
}

// Site API functions

export async function getSites(): Promise<Site[]> {
  if (isDemoMode()) return mockSites;

  const allSites: Site[] = [];
  let nextPage: string | null = `${BASE_URL}/sites`;
  const headers = await getHeaders();

  while (nextPage) {
    const response: Response = await fetch(nextPage, {
      method: "GET",
      headers,
    });

    const result: ApiResponse<Site[]> = await handleResponse<ApiResponse<Site[]>>(response);
    allSites.push(...result.data);
    nextPage = result.pagination?.next || null;
  }

  return allSites;
}

export async function purgePageCache(siteId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/sites/${siteId}/page-cache/purge`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function purgeObjectCache(siteId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/sites/${siteId}/object-cache/purge`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function correctFilePermissions(siteId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/sites/${siteId}/file-permissions/correct`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function runGitDeployment(siteId: number): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/sites/${siteId}/git/deploy`, {
    method: "POST",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

export async function deleteSite(
  siteId: number,
  deleteDatabase?: boolean,
  deleteBackups?: boolean,
): Promise<EventResponse> {
  if (isDemoMode()) return mockEventResponse();

  const headers = await getHeaders();
  const params = new URLSearchParams();
  if (deleteDatabase) params.append("delete_database", "true");
  if (deleteBackups) params.append("delete_backups", "true");

  const url = `${BASE_URL}/sites/${siteId}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });

  return handleResponse<EventResponse>(response);
}

// Events API functions

export async function getEvents(maxPages: number = 5): Promise<Event[]> {
  if (isDemoMode()) return mockEvents;

  const eventsMap = new Map<number, Event>();
  let nextPage: string | null = `${BASE_URL}/events?limit=50`;
  let pagesLoaded = 0;
  const headers = await getHeaders();

  while (nextPage && pagesLoaded < maxPages) {
    const response: Response = await fetch(nextPage, {
      method: "GET",
      headers,
    });

    const result: ApiResponse<Event[]> = await handleResponse<ApiResponse<Event[]>>(response);
    // Deduplicate events by ID
    for (const event of result.data) {
      eventsMap.set(event.id, event);
    }
    nextPage = result.pagination?.next || null;
    pagesLoaded++;
  }

  return Array.from(eventsMap.values());
}
