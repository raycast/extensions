import { environment, LaunchType } from "@raycast/api";

import { getApiBaseUrl } from "../config";
import { getAuthProvider } from "../auth";
import { unwrap, unwrapPage, type Page } from "./envelope";
import { toApiError, ApiError } from "./errors";

export type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  expectNoContent?: boolean;
}

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const url = new URL(`${getApiBaseUrl()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

async function send(options: RequestOptions, isRetry = false): Promise<unknown> {
  const auth = getAuthProvider();
  const token = await auth.getAccessToken(environment.launchType !== LaunchType.Background);

  const hasBody = options.body !== undefined;
  const response = await fetch(buildUrl(options.path, options.query), {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !isRetry) {
    await auth.invalidateAccessToken();
    return send(options, true);
  }

  if (response.status === 204 || options.expectNoContent) {
    if (!response.ok) {
      throw toApiError(response.status, await parseBody(response), response.statusText);
    }
    return undefined;
  }

  const body = await parseBody(response);

  if (!response.ok) {
    throw toApiError(response.status, body, response.statusText || "Request failed");
  }

  return body;
}

export async function requestOne<T>(options: RequestOptions): Promise<T> {
  return unwrap<T>(await send(options));
}

export async function requestPage<T>(options: RequestOptions): Promise<Page<T>> {
  return unwrapPage<T>(await send(options));
}

export async function requestVoid(options: RequestOptions): Promise<void> {
  await send({ ...options, expectNoContent: true });
}

export async function requestAll<T>(
  options: Omit<RequestOptions, "method">,
  pageSize = 100,
  maxPages = 50,
): Promise<T[]> {
  const collected: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { items, pagination } = await requestPage<T>({
      ...options,
      method: "GET",
      query: { ...options.query, currentPage: page, pageSize },
    });

    collected.push(...items);

    if (items.length === 0 || page >= pagination.totalPages) break;
  }

  return collected;
}

export { ApiError };
