import { getPreferenceValues } from "@raycast/api";
import {
  FetchLinksParams,
  LinksResponse,
  CreateLinkResponse,
  UpdateLinksResponse,
  DeleteLinkResponse,
  ErrorResponse,
} from "./types";

const BASE_URL = "https://www.shiori.sh";

function headers(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(
  path: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
): Promise<T> {
  const res = await globalThis.fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });

  const body = (await res.json()) as T | ErrorResponse;

  if (!res.ok || !(body as { success: boolean }).success) {
    const msg = (body as ErrorResponse).error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return body as T;
}

export async function fetchLinks(params: FetchLinksParams = {}): Promise<LinksResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.read) qs.set("read", params.read);
  if (params.sort) qs.set("sort", params.sort);

  const query = qs.toString();
  return request<LinksResponse>(`/api/links${query ? `?${query}` : ""}`);
}

export async function createLink(url: string, title?: string, read?: boolean): Promise<CreateLinkResponse> {
  return request<CreateLinkResponse>("/api/links", {
    method: "POST",
    body: JSON.stringify({ url, ...(title && { title }), ...(read !== undefined && { read }) }),
  });
}

export async function updateLinks(ids: string[], read: boolean): Promise<UpdateLinksResponse> {
  return request<UpdateLinksResponse>("/api/links", {
    method: "PATCH",
    body: JSON.stringify({ ids, read }),
  });
}

export async function deleteLink(id: string): Promise<DeleteLinkResponse> {
  return request<DeleteLinkResponse>(`/api/links/${id}`, {
    method: "DELETE",
  });
}
