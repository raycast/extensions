import { createHash } from "node:crypto";
import { environment, getPreferenceValues } from "@raycast/api";

export interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  url: string;
  secondary_url: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Returns the base URL: the local core while developing the extension, otherwise easyverein.com. */
export function getBaseUrl(): string {
  return environment.isDevelopment ? "http://localhost:8000" : "https://easyverein.com";
}

/** Identifies the instance and API key for caches, with a short hash instead of the key itself. */
export function getAccountKey(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  const hash = createHash("sha256").update(apiToken.trim()).digest("hex").slice(0, 12);
  return `${getBaseUrl()}:${hash}`;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const { apiToken } = getPreferenceValues<Preferences>();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${apiToken.trim()}`, Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Searches the entities (members, invoices, …) of the organization. */
export async function searchEntities(
  query: string,
  typeKey: string | null,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ search: query });
  if (typeKey) {
    params.set("types", typeKey);
  }
  const data = await request<{ results: SearchResult[] }>(`/api/v3.0/command-menu-search?${params}`, signal);
  return data.results;
}

/** Fetches the short name of the organization, used in the member area URL. */
export async function fetchOrganizationShort(): Promise<string | null> {
  const data = await request<{ results: { short: string }[] }>(
    `/api/v3.0/organization/?query=${encodeURIComponent("{short}")}`,
  );
  return data.results[0]?.short ?? null;
}
