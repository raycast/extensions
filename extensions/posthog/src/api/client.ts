import { getPreferenceValues } from "@raycast/api";

export class PostHogAPIError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "PostHogAPIError";
    this.status = status;
    this.body = body;
  }
}

function getConfig() {
  const { personalAPIKey, dataRegionURL } = getPreferenceValues<Preferences>();
  return { personalAPIKey, baseUrl: `${dataRegionURL}/api` };
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { personalAPIKey, baseUrl } = getConfig();
  const cleanPath = path.replace(/^\//, "");
  // PostHog's API is built on Django REST Framework, which is configured with APPEND_SLASH=True.
  // GETs without a trailing slash usually 301-redirect to one with — but mutating verbs (POST/PATCH/DELETE)
  // lose their bodies on redirect, and some org-level endpoints return 503 instead of redirecting.
  // Always send the trailing slash, except when there's a query string.
  const withSlash = cleanPath.includes("?")
    ? cleanPath.replace("?", "/?")
    : cleanPath.endsWith("/")
      ? cleanPath
      : `${cleanPath}/`;
  const url = `${baseUrl}/${withSlash}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${personalAPIKey}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const detail = isRecord(parsed) && typeof parsed.detail === "string" ? parsed.detail : undefined;
    const message = `PostHog API ${response.status} ${response.statusText} for ${method} ${url}${
      detail ? ` — ${detail}` : ""
    }`;
    throw new PostHogAPIError(response.status, message, parsed ?? text);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>("POST", path, body, signal),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>("PATCH", path, body, signal),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>("DELETE", path, undefined, signal),
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
