import { getPreferenceValues } from "@raycast/api";

import { jiraFetch, type RequestInit } from "./httpClient";
import { getJiraCredentials } from "./jiraCredentials";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = Partial<{
  method: Method;
  body: RequestInit["body"];
  params: Record<string, string>;
  headers: Record<string, string>;
  useAgileApi: boolean;
}>;

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const getBaseUrl = () => normalizeBaseUrl(getPreferenceValues<{ siteUrl: string }>().siteUrl);

/** Scheme + host + port only (no path). Use when Jira is behind a subpath: images in HTML use paths from site root. */
export const getHostUrl = () => new URL(getBaseUrl()).origin;

export async function request<T>(path: string, options: RequestOptions = { method: "GET" }) {
  const response = await rawRequest(path, options);
  return response?.json() as T;
}

export async function rawRequest(path: string, options: RequestOptions = { method: "GET" }) {
  const { authorizationHeader } = getJiraCredentials();

  const { params, headers, useAgileApi, ...rest } = options;
  const queryParams = params ? `?${new URLSearchParams(params).toString()}` : "";

  const additionalHeaders = headers || { "Content-Type": "application/json" };

  const response = await jiraFetch(
    `${getBaseUrl()}/${useAgileApi ? "rest/agile/1.0" : "rest/api/2"}${path}${queryParams}`,
    {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
        ...additionalHeaders,
      },
      ...rest,
    },
  );

  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    return response;
  } else {
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`HTTP ${response.status}: ${text.length > 800 ? `${text.slice(0, 800)}…` : text}`);
    }
    throw new Error(JSON.stringify(parsed));
  }
}

const uriCache = new Map<string, string>();

export const getAuthenticatedUri = async (uri: string, contentType: string) => {
  if (uriCache.has(uri)) {
    return uriCache.get(uri)!;
  }

  try {
    const { authorizationHeader } = getJiraCredentials();
    const response = await jiraFetch(uri, {
      headers: {
        Authorization: authorizationHeader,
      },
    });

    if (response.ok) {
      const dataUri = `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
      uriCache.set(uri, dataUri);
      return dataUri;
    }
  } catch {
    // Network/TLS or body read errors
  }
  // Error responses are often HTML, not JSON; never use response.json() here.
  // Fall back to the original URL so lists/detail still render.
  return uri;
};

export async function autocomplete<T>(url: string, queryParams: Record<string, string>) {
  const { authorizationHeader } = getJiraCredentials();

  const { origin, pathname, search } = new URL(url);
  const searchParams = new URLSearchParams(search);
  Object.entries(queryParams).forEach(([key, value]) => searchParams.set(key, value));

  const updatedUrl = `${origin}${pathname}?${searchParams.toString()}`;

  const response = await jiraFetch(updatedUrl, {
    headers: {
      Authorization: authorizationHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return response.json() as T;
  } else {
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`HTTP ${response.status}: ${text.length > 800 ? `${text.slice(0, 800)}…` : text}`);
    }
    throw new Error(JSON.stringify(parsed));
  }
}
