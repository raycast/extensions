import { getPreferenceValues } from "@raycast/api";
import { LightdashContentItem, LightdashContentResponse } from "./types";

export const PREFERENCES_MISSING_ERROR = "PreferencesMissingError";
export const AUTH_ERROR = "AuthError";

interface EffectivePreferences {
  lightdashUrl: string;
  personalAccessToken: string;
  projectUuid: string;
}

export function getEffectivePreferences(): EffectivePreferences {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.lightdashUrl) {
    const error = new Error("Lightdash Instance URL is required. Please configure it in extension preferences.");
    error.name = PREFERENCES_MISSING_ERROR;
    throw error;
  }

  if (!prefs.personalAccessToken) {
    const error = new Error("Personal Access Token is required. Please configure it in extension preferences.");
    error.name = PREFERENCES_MISSING_ERROR;
    throw error;
  }

  if (!prefs.projectUuid) {
    const error = new Error("Project UUID is required. Please configure it in extension preferences.");
    error.name = PREFERENCES_MISSING_ERROR;
    throw error;
  }

  // Normalize: remove trailing slash from URL
  const lightdashUrl = prefs.lightdashUrl.replace(/\/+$/, "");

  return {
    lightdashUrl,
    personalAccessToken: prefs.personalAccessToken,
    projectUuid: prefs.projectUuid,
  };
}

export async function lightdashApiRequest<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const prefs = getEffectivePreferences();

  const url = `${prefs.lightdashUrl}${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `ApiKey ${prefs.personalAccessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    let detail = "Authentication failed. Check your Personal Access Token.";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) {
        detail = body.error.message;
      }
    } catch {
      // ignore parse errors
    }
    const error = new Error(detail);
    error.name = AUTH_ERROR;
    throw error;
  }

  if (!response.ok) {
    let detail = `API request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) {
        detail = body.error.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export async function testConnection(signal?: AbortSignal): Promise<void> {
  const prefs = getEffectivePreferences();
  await lightdashApiRequest(`/api/v1/org/projects`, signal);
  // If this doesn't throw, connection is valid
  // Also verify that the projectUuid exists
  const projectsResponse = await lightdashApiRequest<{
    status: string;
    results: Array<{ projectUuid: string; name: string }>;
  }>(`/api/v1/org/projects`, signal);

  const projectExists = projectsResponse.results.some((p) => p.projectUuid === prefs.projectUuid);
  if (!projectExists) {
    throw new Error(
      `Project UUID "${prefs.projectUuid}" not found. Available projects: ${projectsResponse.results.map((p) => `${p.name} (${p.projectUuid})`).join(", ")}`,
    );
  }
}

export async function searchLightdashItems(
  query: string,
  signal?: AbortSignal,
  limit?: number,
): Promise<LightdashContentItem[]> {
  const prefs = getEffectivePreferences();

  const pageSize = 100;
  const allItems: LightdashContentItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const params = new URLSearchParams();
    params.set("projectUuids[]", prefs.projectUuid);
    params.set("contentTypes[]", "chart");
    params.append("contentTypes[]", "dashboard");
    params.set("pageSize", pageSize.toString());
    params.set("page", page.toString());
    params.set("sortBy", "last_updated_at");
    params.set("sortDirection", "desc");

    if (query.trim()) {
      params.set("search", query.trim());
    }

    const response = await lightdashApiRequest<LightdashContentResponse>(
      `/api/v2/content?${params.toString()}`,
      signal,
    );

    if (response.results?.data) {
      allItems.push(...response.results.data);
    }

    totalPages = response.results?.pagination?.totalPageCount ?? 1;
    page++;

    // Early exit if we have enough items
    if (limit && allItems.length >= limit) {
      break;
    }
  }

  return limit ? allItems.slice(0, limit) : allItems;
}

export function getItemUrl(item: LightdashContentItem): string {
  const prefs = getEffectivePreferences();
  const baseUrl = prefs.lightdashUrl;
  const projectUuid = item.project?.uuid || prefs.projectUuid;

  switch (item.contentType) {
    case "dashboard":
      return `${baseUrl}/projects/${projectUuid}/dashboards/${item.uuid}/${item.slug || ""}`;
    case "chart":
      return `${baseUrl}/projects/${projectUuid}/saved/${item.uuid}/${item.slug || ""}`;
    case "space":
      return `${baseUrl}/projects/${projectUuid}/spaces/${item.uuid}`;
    default:
      return `${baseUrl}/projects/${projectUuid}`;
  }
}
