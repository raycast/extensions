/**
 * Thin fetch wrapper for Orbiform's /api/v1/* REST API (see the main repo's
 * src/app/api/v1/). Every call attaches the OAuth access token from
 * ./oauth.ts as a Bearer credential. Talks to BASE_URL from ./oauth.ts —
 * pinned to production, not configurable.
 */
import { authorize, BASE_URL } from "./oauth";

export interface OrbiformForm {
  id: string;
  title: string;
  responseCount: number;
  createdAt: string;
  publicUrl: string;
}

export interface OrbiformFormStats {
  responseCount: number;
  conversionRate: number;
  last7DaysTrend: { date: string; count: number }[];
}

export interface AiCreateResult {
  id: string;
  title: string;
  publicUrl: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await authorize();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; error_description?: string } | null;
    const message = body?.error_description || body?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function listForms(): Promise<OrbiformForm[]> {
  return apiFetch<OrbiformForm[]>("/api/v1/forms");
}

export function getFormStats(formId: string): Promise<OrbiformFormStats> {
  return apiFetch<OrbiformFormStats>(`/api/v1/forms/${encodeURIComponent(formId)}/stats`);
}

export function aiCreateForm(prompt: string): Promise<AiCreateResult> {
  return apiFetch<AiCreateResult>("/api/v1/forms/ai-create", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
