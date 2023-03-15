import fetch, { RequestInit } from "node-fetch";

import { getJiraCredentials } from "../helpers/withJiraCredentials";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = Partial<{
  method: Method;
  body: RequestInit["body"];
  params: Record<string, string>;
  headers: Record<string, string>;
  useAgileApi: boolean;
}>;

export async function request<T>(path: string, options: RequestOptions = { method: "GET" }) {
  const { cloudId, authorizationHeader } = getJiraCredentials();

  const { params, headers, useAgileApi, ...rest } = options;
  const queryParams = params ? `?${new URLSearchParams(params).toString()}` : "";

  const additionalHeaders = headers || { "Content-Type": "application/json" };

  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/${
      useAgileApi ? "rest/agile/1.0" : "rest/api/3"
    }${path}${queryParams}`,
    {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
        ...additionalHeaders,
      },
      ...rest,
    }
  );

  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    return response.json() as T;
  } else {
    const result = await response.json();
    throw new Error(JSON.stringify(result));
  }
}

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

  if (response.ok) {
    return response.json() as T;
  } else {
    const result = await response.json();
    throw new Error(JSON.stringify(result));
  }
}
