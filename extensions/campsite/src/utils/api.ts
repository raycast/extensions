import { showFailureToast } from "@raycast/utils";
import { oauthClient } from "./oauth";
import fetch from "node-fetch";
import { CreatePostRequest, Post, Project } from "./types";
import { getPreferenceValues, openExtensionPreferences } from "@raycast/api";

export const CLIENT_ID = "eII2Gy4zCSx4RcB-nyA2rAfxSR8dTT2WnK8rg-Y5L4c";
export const API_URL = "https://api.campsite.co/v2";
export const ORG_SLUG_MISSING_MESSAGE =
  "Please enter your organization slug in extension preferences before creating a post.";

type ApiClientOptions = {
  baseUrl?: string;
  requireOrgSlug?: boolean;
};

type RequestOptions = ApiClientOptions & {
  method: string;
  body?: object;
  params?: URLSearchParams;
};

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { orgSlug } = getPreferenceValues<ExtensionPreferences>();
  const { requireOrgSlug = true } = options;

  if (!orgSlug && requireOrgSlug) {
    showFailureToast(ORG_SLUG_MISSING_MESSAGE, {
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: openExtensionPreferences,
      },
    });
    return Promise.reject(ORG_SLUG_MISSING_MESSAGE);
  }

  const params = options.params ? new URLSearchParams(options.params) : undefined;

  const baseUrl = options.baseUrl ?? API_URL;

  const response = await fetch(`${baseUrl}${path}?${params?.toString() ?? ""}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      "X-Campsite-Org": `${orgSlug}`,
      Authorization: `Bearer ${(await oauthClient.getTokens())?.accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    showFailureToast(response.statusText);
    return Promise.reject(response.statusText);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, params?: URLSearchParams, options?: ApiClientOptions) =>
    request<T>(path, { method: "GET", params, ...options }),
  post: <T>(path: string, body: object, options?: ApiClientOptions) =>
    request<T>(path, { method: "POST", body, ...options }),
};

export async function createPost(body: CreatePostRequest) {
  return apiClient.post<Post>(`/posts`, body);
}

export async function getProjects() {
  return apiClient.get<Project[]>(`/projects`);
}
