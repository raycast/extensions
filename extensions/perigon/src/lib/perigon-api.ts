import { showFailureToast } from "@raycast/utils";
import { getAccessToken } from "@raycast/utils";
import {
  parseArticlesResponse,
  parseMonitorEventsResponse,
  parseMonitorNewslettersResponse,
  parseMonitorsResponse,
  parseStoriesResponse,
  type PerigonArticle,
  type PerigonMonitor,
  type PerigonMonitorEvent,
  type PerigonMonitorNewsletter,
  type PerigonStory,
} from "./types";

const API_BASE = "https://api.perigon.io/v1";

export class PerigonApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PerigonApiError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const json: unknown = await response.json();
    if (typeof json === "object" && json !== null) {
      if ("message" in json && typeof json.message === "string") {
        return json.message;
      }
      if ("error" in json && typeof json.error === "string") {
        return json.error;
      }
    }
  } catch {
    // ignore JSON parse errors
  }
  return response.statusText || `Request failed (${response.status})`;
}

export async function perigonFetch(path: string, init?: RequestInit): Promise<Response> {
  const { token } = getAccessToken();
  if (!token) {
    throw new PerigonApiError("Sign in to Perigon to continue.", 401);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 403) {
      throw new PerigonApiError(message || "Your account does not have access to this data.", 403);
    }
    if (response.status === 401) {
      throw new PerigonApiError(message || "Your Perigon session expired. Sign in again.", 401);
    }
    if (response.status === 429) {
      throw new PerigonApiError(message || "Perigon rate limit reached. Try again shortly.", 429);
    }
    throw new PerigonApiError(message, response.status);
  }

  return response;
}

export async function showPerigonFailure(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  await showFailureToast(message);
}

export async function searchArticles(query: string, size = 20): Promise<PerigonArticle[]> {
  const params = new URLSearchParams({
    q: query,
    size: String(size),
    sortBy: "date",
  });
  const response = await perigonFetch(`/articles/all?${params.toString()}`);
  const json: unknown = await response.json();
  return parseArticlesResponse(json);
}

export async function searchStories(query: string, size = 20): Promise<PerigonStory[]> {
  const params = new URLSearchParams({
    q: query,
    size: String(size),
    sortBy: "createdAt",
    showStoryPageInfo: "true",
  });
  const response = await perigonFetch(`/stories/all?${params.toString()}`);
  const json: unknown = await response.json();
  return parseStoriesResponse(json);
}

export async function listMonitors(): Promise<PerigonMonitor[]> {
  const params = new URLSearchParams({
    page: "0",
    size: "100",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const response = await perigonFetch(`/api/monitors?${params.toString()}`);
  const json: unknown = await response.json();
  return parseMonitorsResponse(json);
}

export async function listMonitorEvents(monitorUuid: string): Promise<PerigonMonitorEvent[]> {
  const params = new URLSearchParams({
    page: "0",
    size: "25",
    sortBy: "eventDate",
    sortOrder: "desc",
  });
  const response = await perigonFetch(`/api/monitors/${encodeURIComponent(monitorUuid)}/events?${params.toString()}`);
  const json: unknown = await response.json();
  return parseMonitorEventsResponse(json);
}

export async function listMonitorNewsletters(monitorUuid: string): Promise<PerigonMonitorNewsletter[]> {
  const params = new URLSearchParams({
    page: "0",
    size: "25",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const response = await perigonFetch(
    `/api/monitors/${encodeURIComponent(monitorUuid)}/newsletters?${params.toString()}`,
  );
  const json: unknown = await response.json();
  return parseMonitorNewslettersResponse(json);
}
