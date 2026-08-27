import { getAccessToken } from "@raycast/utils";

import { assertCalendlyOAuthConfigured } from "../oauth/calendly";

const API_BASE_URL = "https://api.calendly.com";

interface CalendlyErrorPayload {
  message?: string;
  title?: string;
  details?: Array<{ message?: string; parameter?: string }>;
  required_scopes?: string[];
}

function errorMessage(payload: CalendlyErrorPayload | undefined, status: number) {
  const detail = payload?.details
    ?.map((item) => item.message)
    .filter(Boolean)
    .join(" ");
  const base = detail || payload?.message || payload?.title || `Calendly request failed (${status})`;
  const requiredScopes = payload?.required_scopes?.join(", ");
  return requiredScopes ? `${base} Required scopes: ${requiredScopes}.` : base;
}

export async function calendlyRequest<T>(
  path: string,
  options: RequestInit & { query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  assertCalendlyOAuthConfigured();
  const { token } = getAccessToken();
  const url = new URL(path.startsWith("http") ? path : `${API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let payload: CalendlyErrorPayload | undefined;
    try {
      payload = (await response.json()) as CalendlyErrorPayload;
    } catch {
      // Calendly occasionally returns an empty response body for gateway errors.
    }
    throw new Error(errorMessage(payload, response.status));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function resourceId(uriOrId: string, resource: string) {
  const marker = `/${resource}/`;
  const markerIndex = uriOrId.indexOf(marker);
  return markerIndex >= 0 ? uriOrId.slice(markerIndex + marker.length).split(/[/?#]/)[0] : uriOrId;
}
