import { getPreferenceValues } from "@raycast/api";

export const API_BASE = "https://app.seomatic.ai/api/v1";

export function authHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { Authorization: `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" };
}

/** Parse a SEOmatic response; a non-2xx answer throws with the API's own `error` text. */
export async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // Not JSON (for example an HTML error page from a proxy).
  }
  if (!response.ok) {
    const error = (body as { error?: string } | undefined)?.error;
    if (response.status === 401) {
      throw new Error("Invalid API key. Check it in the extension preferences.");
    }
    throw new Error(error || `SEOmatic answered ${response.status}`);
  }
  return body as T;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  return parseResponse<T>(response);
}

export interface GscRow {
  page?: string;
  query?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscRows {
  site?: string;
  window_days?: number;
  rows: GscRow[];
}
