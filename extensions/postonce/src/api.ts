import { getPreferenceValues } from "@raycast/api";

import { Account, CreatePostInput, ListResponse, Post } from "./types";

const API_URL = "https://postonce.to/api/public/v1";
export const DASHBOARD_URL = "https://postonce.to/dashboard";

const headers = (extra: Record<string, string> = {}) => {
  const { apiKey } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: headers(init.headers as Record<string, string> | undefined),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string; hint?: string } };
    const message = body.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(body.error?.hint ? `${message} ${body.error.hint}` : message);
  }

  return response.json() as Promise<T>;
};

export const listAccounts = async (): Promise<Account[]> => {
  const { data } = await request<{ data: Account[] }>("/accounts");
  return data;
};

export const listPosts = async (after?: string): Promise<ListResponse<Post>> => {
  const query = new URLSearchParams({ limit: "25" });
  if (after) query.set("after", after);
  return request<ListResponse<Post>>(`/posts?${query}`);
};

export const createPost = async (input: CreatePostInput, idempotencyKey: string): Promise<Post> => {
  const { data } = await request<{ data: Post }>("/posts", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
  return data;
};

export const cancelPost = async (id: string): Promise<Post> => {
  const { data } = await request<{ data: Post }>(`/posts/${id}/cancel`, { method: "POST" });
  return data;
};
