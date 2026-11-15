import { type RequestInit } from "node-fetch";

import { getJiraCredentials } from "../api/jiraCredentials";

import { parseJiraResponse } from "./response";
import fetch from "./fetch";

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

function getResourceUrl(uri: string) {
  const { cloudId, siteUrl } = getJiraCredentials();
  const site = new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`);
  const url = new URL(uri, `${site.origin}/`);

  if (cloudId && url.origin === site.origin && url.pathname.startsWith("/rest/")) {
    return `${getBaseUrl()}${url.pathname}${url.search}`;
  }

  return url.toString();
}

function isJiraResource(url: string) {
  const { cloudId, siteUrl } = getJiraCredentials();
  const site = new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`);
  const resource = new URL(url);
  return (
    resource.protocol === "https:" &&
    (resource.origin === site.origin ||
      (Boolean(cloudId) &&
        resource.origin === "https://api.atlassian.com" &&
        resource.pathname.startsWith(`/ex/jira/${cloudId}/`)))
  );
}

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
  const url = getResourceUrl(uri);
  const response = await fetch(url, {
    headers: isJiraResource(url) ? { Authorization: authorizationHeader } : {},
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
  const resourceUrl = getResourceUrl(url);
  if (!isJiraResource(resourceUrl)) {
    throw new Error("Jira returned an autocomplete URL outside the selected site.");
  }

  // The url passed in parameters can already come with default query parameters
  const { origin, pathname, search } = new URL(resourceUrl);
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
