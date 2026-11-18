import { getPreferenceValues } from "@raycast/api";
import {
  FetchLinksParams,
  LinksResponse,
  CreateLinkResponse,
  UpdateLinksResponse,
  UpdateLinkResponse,
  DeleteLinkResponse,
} from "./types";

const BASE_URL = "https://www.shiori.sh";

class ShioriRequestError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey.trim()) throw new Error("Add your Shiori API key in extension preferences.");
  const timeout = AbortSignal.timeout(30_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  try {
    const res = await globalThis.fetch(`${BASE_URL}${path}`, {
      ...init,
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    // Do not include response bodies or network errors, which could echo credentials.
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new ShioriRequestError("Shiori authentication failed. Check your API key in extension preferences.");
      }
      if (res.status === 429) throw new ShioriRequestError("Shiori rate limit reached. Wait a minute before retrying.");
      throw new ShioriRequestError(`Shiori request failed (${res.status}). Please try again.`);
    }
    let body;
    try {
      body = await res.json();
    } catch {
      throw new ShioriRequestError("Shiori returned an invalid response. Please try again.");
    }
    if (!body || typeof body !== "object" || !("success" in body) || body.success !== true)
      throw new ShioriRequestError("Shiori could not complete the request.");
    return body as T;
  } catch (error) {
    if (init.signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    if (timeout.aborted)
      throw new ShioriRequestError("Shiori request timed out. Check your library before retrying a save.");
    if (error instanceof ShioriRequestError) throw error;
    throw new Error("Could not connect to Shiori. Check your connection.");
  }
}

export async function fetchLinks(params: FetchLinksParams = {}, signal?: AbortSignal): Promise<LinksResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.read) qs.set("read", params.read);
  if (params.sort) qs.set("sort", params.sort);
  if (params.search) qs.set("search", params.search);

  if (params.favorite !== undefined) qs.set("favorite", String(params.favorite));
  if (params.tag?.trim()) qs.set("tag", params.tag.trim());
  if (params.since?.trim()) qs.set("since", params.since.trim());

  const query = qs.toString();
  const response = await request<LinksResponse>(`/api/links${query ? `?${query}` : ""}`, { signal });
  if (
    !Array.isArray(response.links) ||
    !Number.isSafeInteger(response.total) ||
    response.total < 0 ||
    response.links.some((link) => !link || typeof link.id !== "string" || typeof link.url !== "string")
  ) {
    throw new Error("Shiori returned an invalid links page. Please refresh.");
  }
  return response;
}

export async function createLink(url: string, title?: string, read?: boolean): Promise<CreateLinkResponse> {
  const result = await request<CreateLinkResponse>("/api/links", {
    method: "POST",
    body: JSON.stringify({
      url: normalizeUrl(url),
      ...(title?.trim() && { title: title.trim() }),
      ...(read !== undefined && { read }),
    }),
  });
  if (typeof result.linkId !== "string" || !result.linkId) {
    throw new Error("Shiori did not return a link ID. Check your library before retrying the save.");
  }
  return result;
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("URL is required.");
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const isHostWithPort = /^[^/:\s]+:\d+(?:[/?#]|$)/.test(trimmed);
  const withScheme = hasScheme && !isHostWithPort ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS URL without embedded credentials.");
  }
}

export async function updateLinks(ids: string[], read: boolean): Promise<UpdateLinksResponse> {
  return request<UpdateLinksResponse>("/api/links", {
    method: "PATCH",
    body: JSON.stringify({ ids, read }),
  });
}

export async function updateLinkDetails(
  id: string,
  title: string,
  summary?: string | null,
): Promise<UpdateLinkResponse> {
  return request<UpdateLinkResponse>(`/api/links/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title,
      ...(summary !== undefined && { summary }),
    }),
  });
}

export async function deleteLink(id: string): Promise<DeleteLinkResponse> {
  return request<DeleteLinkResponse>(`/api/links/${id}`, {
    method: "DELETE",
  });
}
