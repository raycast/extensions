import { getPreferenceValues } from "@raycast/api";

import type { HttpErrorBody } from "../types/vikunja";

type QueryValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null
  | undefined;

export class VikunjaApiError extends Error {
  body?: HttpErrorBody;
  code?: number;
  status: number;

  constructor(message: string, status: number, body?: HttpErrorBody) {
    super(message);
    this.name = "VikunjaApiError";
    this.status = status;
    this.body = body;
    this.code = body?.code;
  }
}

interface RequestOptions {
  body?: unknown;
  method?: string;
  query?: Record<string, QueryValue>;
}

function getPreferenceBaseUrl() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  return baseUrl.trim();
}

export function getWebBaseUrl() {
  const baseUrl = getPreferenceBaseUrl().replace(/\/+$/, "");

  if (baseUrl.endsWith("/api/v1")) {
    return baseUrl.slice(0, -"/api/v1".length);
  }

  return baseUrl;
}

export function getApiBaseUrl() {
  const baseUrl = getPreferenceBaseUrl().replace(/\/+$/, "");

  if (baseUrl.endsWith("/api/v1")) {
    return baseUrl;
  }

  return `${baseUrl}/api/v1`;
}

function appendQuery(url: URL, query?: Record<string, QueryValue>) {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }
}

function parseResponsePayload(text: string) {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toApiError(status: number, payload: unknown) {
  const body =
    typeof payload === "object" && payload !== null
      ? (payload as HttpErrorBody)
      : undefined;

  if (status === 401) {
    return new VikunjaApiError(
      "Invalid API token. Regenerate the token in Vikunja and update the Raycast preference.",
      status,
      body,
    );
  }

  if (status === 521) {
    return new VikunjaApiError(
      "Vikunja is unavailable right now. HTTP 521 means the proxy could not reach the origin server.",
      status,
      body,
    );
  }

  if (body?.message) {
    return new VikunjaApiError(body.message, status, body);
  }

  return new VikunjaApiError(
    `Request failed with status ${status}.`,
    status,
    body,
  );
}

export async function requestRaw<T>(
  path: string,
  options: RequestOptions = {},
) {
  const { apiToken } = getPreferenceValues<Preferences>();
  const url = new URL(path.replace(/^\/+/, ""), `${getApiBaseUrl()}/`);

  appendQuery(url, options.query);

  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${apiToken.trim()}`,
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      headers,
      method: options.method ?? "GET",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed.";
    throw new VikunjaApiError(`Could not reach Vikunja. ${message}`, 0);
  }

  const text = await response.text();
  const data = parseResponsePayload(text) as T;

  if (!response.ok) {
    throw toApiError(response.status, data);
  }

  return {
    data,
    headers: response.headers,
    status: response.status,
  };
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
) {
  const response = await requestRaw<T>(path, options);
  return response.data;
}

export async function requestPaginatedArray<T>(
  path: string,
  query?: Record<string, QueryValue>,
) {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await requestRaw<T[]>(path, {
      query: {
        ...query,
        page,
        per_page: 100,
      },
    });

    if (Array.isArray(response.data)) {
      items.push(...response.data);
    }

    const headerValue = response.headers.get("x-pagination-total-pages");
    totalPages = headerValue ? Number(headerValue) || 1 : 1;
    page += 1;
  }

  return items;
}
