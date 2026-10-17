import { getPreferenceValues } from "@raycast/api";
import type { QueryFilter } from "../types";

export const API_BASE = "https://api.databuddy.cc";
export const DASHBOARD_URL = "https://app.databuddy.cc";
export const LANDING_URL = "https://databuddy.cc";
export const SHORT_LINK_HOST = "dby.sh";

const QUERY_BASE = `${API_BASE}/v1`;

function getHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { "x-api-key": apiKey, "Content-Type": "application/json" };
}

export interface QueryResult {
  parameter: string;
  success: boolean;
  data: Record<string, unknown>[];
}

export async function query(
  resourceId: string,
  parameters: string[],
  preset: string,
  limit?: number,
  filters?: QueryFilter[],
  idType: "website_id" | "link_id" = "website_id",
) {
  if (!resourceId) throw new Error("Resource ID is required for query");
  const res = await fetch(`${QUERY_BASE}/query?${idType}=${resourceId}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      parameters,
      preset,
      ...(limit ? { limit } : {}),
      ...(filters?.length ? { filters } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid API key. Check your key in extension preferences.");
    }
    throw new Error(`API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { success: boolean; data: QueryResult[] };
  return json.data ?? [];
}

export function findParam(results: QueryResult[], name: string) {
  return results.find((d) => d.parameter === name);
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${QUERY_BASE}${path}`, { headers: getHeaders() });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid API key. Check your key in extension preferences.");
    }
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return (await res.json()) as T;
}

export async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid API key. Check your key in extension preferences.");
    }
    if (res.status === 409) {
      throw new Error("A resource with this identifier already exists.");
    }
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}
