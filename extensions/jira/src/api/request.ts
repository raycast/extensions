import fetch, { type RequestInit } from "node-fetch";

import { getJiraCredentials } from "../api/jiraCredentials";

import { parseJiraResponse } from "./response";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = Partial<{
  method: Method;
  body: RequestInit["body"];
  params: Record<string, string>;
  headers: Record<string, string>;
  useAgileApi: boolean;
}>;

export const getBaseUrl = () => {
  const { cloudId, siteUrl } = getJiraCredentials();

  if (cloudId) {
    return `https://api.atlassian.com/ex/jira/${cloudId}`;
  }
  return `https://${siteUrl}`;
};

export async function request<T>(path: string, options: RequestOptions = { method: "GET" }) {
  const { authorizationHeader } = getJiraCredentials();

  const { params, headers, useAgileApi, ...rest } = options;
  const queryParams = params ? `?${new URLSearchParams(params).toString()}` : "";

  const additionalHeaders = headers || { "Content-Type": "application/json" };

  const response = await fetch(
    `${getBaseUrl()}/${useAgileApi ? "rest/agile/1.0" : "rest/api/3"}${path}${queryParams}`,
    {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
        ...additionalHeaders,
      },
      ...rest,
    },
  );

  return parseJiraResponse<T>(response);
}

export const getAuthenticatedUri = async (uri: string, contentType: string) => {
  const { authorizationHeader } = getJiraCredentials();
  const response = await fetch(uri, {
    headers: {
      Authorization: authorizationHeader,
    },
  });

  if (response.ok) {
    const dataUri = `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    return dataUri;
  } else {
    await parseJiraResponse(response);
    throw new Error(`Jira request failed with status ${response.status}.`);
  }
};

export async function autocomplete<T>(url: string, queryParams: Record<string, string>) {
  const { authorizationHeader } = getJiraCredentials();

  // The url passed in parameters can already come with default query parameters
  const { origin, pathname, search } = new URL(url);
  const searchParams = new URLSearchParams(search);
  Object.entries(queryParams).forEach(([key, value]) => searchParams.set(key, value));
  const updatedUrl = `${origin}${pathname}?${searchParams.toString()}`;

  const response = await fetch(updatedUrl, {
    headers: {
      Authorization: authorizationHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return parseJiraResponse<T>(response);
}
