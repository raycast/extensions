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
    if (response.status === 401) {
      throw new Error(
        "Authentication failed. Update the Typefully API Key in extension preferences with a valid key from https://typefully.com/?settings=api.",
      );
    }
    throw new Error(detailMessages ? `${message}: ${detailMessages}` : message);
  }

  return data as T;
}

export async function getCurrentUser() {
  return requestJson<unknown>("/v2/me", { method: "GET" });
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
    orderBy?: string;
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
  if (params.orderBy) {
    searchParams.append("order_by", params.orderBy);
  }

  const path = `/v2/social-sets/${socialSetId}/drafts`;
  const queryString = searchParams.toString();
  const url = queryString ? `${path}?${queryString}` : path;
  return requestJson<PagedResponse<DraftListItem>>(url, { method: "GET" });
}

export async function getDraft(socialSetId: number, draftId: number, excludeCommentMarkers = false) {
  const query = excludeCommentMarkers ? "?exclude_comment_markers=true" : "";
  return requestJson<DraftDetail>(`/v2/social-sets/${socialSetId}/drafts/${draftId}${query}`, { method: "GET" });
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

export async function getQueue(socialSetId: number, startDate: string, endDate: string) {
  return requestJson<unknown>(
    `/v2/social-sets/${socialSetId}/queue?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    { method: "GET" },
  );
}

export async function getQueueSchedule(socialSetId: number) {
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/queue/schedule`, { method: "GET" });
}

export async function updateQueueSchedule(socialSetId: number, rules: Array<{ h: number; m: number; days: string[] }>) {
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/queue/schedule`, {
    method: "PUT",
    body: { rules },
  });
}

export async function createTag(socialSetId: number, name: string) {
  return requestJson<Tag>(`/v2/social-sets/${socialSetId}/tags`, { method: "POST", body: { name } });
}

export async function getXPostAnalytics(
  socialSetId: number,
  params: { startDate: string; endDate: string; includeReplies?: boolean; limit?: number; offset?: number },
) {
  const query = new URLSearchParams({ start_date: params.startDate, end_date: params.endDate });
  if (params.includeReplies) query.set("include_replies", "true");
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/analytics/x/posts?${query}`, { method: "GET" });
}

export async function getXFollowerAnalytics(socialSetId: number, startDate?: string, endDate?: string) {
  const query = new URLSearchParams();
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/analytics/x/followers${query.size ? `?${query}` : ""}`, {
    method: "GET",
  });
}

export async function resolveLinkedInOrganization(socialSetId: number, organizationUrl: string) {
  return requestJson<unknown>(
    `/v2/social-sets/${socialSetId}/linkedin/organizations/resolve?organization_url=${encodeURIComponent(organizationUrl)}`,
    { method: "GET" },
  );
}

export async function listCommentThreads(
  socialSetId: number,
  draftId: number,
  params: { platform?: string; status?: string; limit?: number; offset?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.platform) query.set("platform", params.platform);
  if (params.status) query.set("status", params.status);
  query.set("limit", String(params.limit ?? 10));
  if (params.offset) query.set("offset", String(params.offset));
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/drafts/${draftId}/comment-threads?${query}`, {
    method: "GET",
  });
}

export async function createCommentThread(
  socialSetId: number,
  draftId: number,
  payload: { selected_text: string; text: string; platform?: string; post_index?: number; occurrence?: number },
) {
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/drafts/${draftId}/comment-threads`, {
    method: "POST",
    body: payload,
  });
}

export async function replyToCommentThread(socialSetId: number, draftId: number, threadId: string, text: string) {
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/drafts/${draftId}/comment-threads/${threadId}/comments`, {
    method: "POST",
    body: { text },
  });
}

export async function resolveCommentThread(socialSetId: number, draftId: number, threadId: string) {
  return requestJson<unknown>(`/v2/social-sets/${socialSetId}/drafts/${draftId}/comment-threads/${threadId}/resolve`, {
    method: "POST",
  });
}

export async function updateComment(
  socialSetId: number,
  draftId: number,
  threadId: string,
  commentId: string,
  text: string,
) {
  return requestJson<unknown>(
    `/v2/social-sets/${socialSetId}/drafts/${draftId}/comment-threads/${threadId}/comments/${commentId}`,
    { method: "PATCH", body: { text } },
  );
}

export async function deleteComment(socialSetId: number, draftId: number, threadId: string, commentId?: string) {
  const suffix = commentId ? `/comments/${commentId}` : "";
  await requestJson<void>(`/v2/social-sets/${socialSetId}/drafts/${draftId}/comment-threads/${threadId}${suffix}`, {
    method: "DELETE",
  });
}

export async function createMediaUpload(socialSetId: number, fileName: string) {
  return requestJson<{ media_id: string; upload_url: string }>(`/v2/social-sets/${socialSetId}/media/upload`, {
    method: "POST",
    body: { file_name: fileName },
  });
}
