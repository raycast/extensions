import { getPreferences } from "./preferences";
import type {
  ApiErrorResponse,
  DraftCreateRequest,
  DraftDetail,
  DraftListItem,
  DraftUpdateRequest,
  MediaStatus,
  PagedResponse,
  SocialSetDetail,
  SocialSetListItem,
  Tag,
} from "./types";

const API_BASE = "https://api.typefully.com";
const DEFAULT_PAGE_SIZE = 50;

function getAuthHeaders() {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    throw new Error("Missing Typefully API key");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

async function requestJson<T>(path: string, options: Omit<RequestInit, "body"> & { body?: unknown } = {}) {
  const { body, ...restOptions } = options;
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...((restOptions.headers as Record<string, string>) ?? {}),
  };

  const init: RequestInit = {
    ...restOptions,
    headers,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), init);
  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    const apiError = data as ApiErrorResponse | undefined;
    const message = apiError?.error?.message || `Request failed with status ${response.status}`;
    const detailMessages = apiError?.error?.details
      ?.map((detail) => detail.message)
      .filter(Boolean)
      .join(", ");
    throw new Error(detailMessages ? `${message}: ${detailMessages}` : message);
  }

  return data as T;
}

export async function listSocialSets() {
  const results: SocialSetListItem[] = [];
  let offset = 0;

  while (true) {
    const url = buildUrl("/v2/social-sets", {
      limit: DEFAULT_PAGE_SIZE,
      offset,
    });
    const data = await requestJson<PagedResponse<SocialSetListItem>>(url, {
      method: "GET",
    });
    results.push(...data.results);
    if (!data.next || data.results.length === 0) {
      break;
    }
    offset += data.limit || DEFAULT_PAGE_SIZE;
  }

  return results;
}

export async function getSocialSetDetail(socialSetId: number) {
  return requestJson<SocialSetDetail>(`/v2/social-sets/${socialSetId}/`, {
    method: "GET",
  });
}

export async function listDrafts(
  socialSetId: number,
  params: {
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {},
) {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== "all") {
    searchParams.append("status", params.status);
  }
  if (params.tags) {
    for (const tag of params.tags) {
      searchParams.append("tag", tag);
    }
  }
  if (params.limit) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.append("offset", String(params.offset));
  }

  const path = `/v2/social-sets/${socialSetId}/drafts`;
  const queryString = searchParams.toString();
  const url = queryString ? `${path}?${queryString}` : path;
  return requestJson<PagedResponse<DraftListItem>>(url, { method: "GET" });
}

export async function getDraft(socialSetId: number, draftId: number) {
  return requestJson<DraftDetail>(`/v2/social-sets/${socialSetId}/drafts/${draftId}`, { method: "GET" });
}

export async function createDraft(socialSetId: number, payload: DraftCreateRequest) {
  return requestJson<DraftDetail>(`/v2/social-sets/${socialSetId}/drafts`, {
    method: "POST",
    body: payload,
  });
}

export async function deleteDraft(socialSetId: number, draftId: number) {
  await requestJson<void>(`/v2/social-sets/${socialSetId}/drafts/${draftId}`, {
    method: "DELETE",
  });
}

export async function updateDraft(socialSetId: number, draftId: number, payload: DraftUpdateRequest) {
  return requestJson<DraftDetail>(`/v2/social-sets/${socialSetId}/drafts/${draftId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function getMediaStatus(socialSetId: number, mediaId: string) {
  return requestJson<MediaStatus>(`/v2/social-sets/${socialSetId}/media/${mediaId}`, { method: "GET" });
}

export async function listTags(socialSetId: number) {
  const results: Tag[] = [];
  let offset = 0;

  while (true) {
    const url = buildUrl(`/v2/social-sets/${socialSetId}/tags`, {
      limit: DEFAULT_PAGE_SIZE,
      offset,
    });
    const data = await requestJson<PagedResponse<Tag>>(url, { method: "GET" });
    results.push(...data.results);
    if (!data.next || data.results.length === 0) {
      break;
    }
    offset += data.limit || DEFAULT_PAGE_SIZE;
  }

  return results;
}
