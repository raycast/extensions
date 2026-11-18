import { getPreferences } from "./preferences";
import type {
  ApiErrorResponse,
  CreateRawDraftRequest,
  DraftDetail,
  DraftListItem,
  DraftUpdateRequest,
  MediaStatus,
  ParsedPostContent,
  PagedResponse,
  SocialSetDetail,
  SocialSetListItem,
  Tags,
} from "./types";

const API_BASE = "https://srvr.postey.ai";
const APP_BASE = "https://app.postey.ai";
const DEFAULT_PAGE_SIZE = 50;

type UserPostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "ERROR";

type UserPostResponse = {
  title?: string | null;
  share_id?: string | null;
  tags?: Tags[];
  socials?: string[];
  status: UserPostStatus;
  post_id: number;
  account_id: number;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  scheduled_date?: string | null;
};

type PaginatedUserPostsResponse = {
  data: UserPostResponse[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
};

function getAuthHeaders() {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    throw new Error("Missing Postey API key");
  }
  return {
    "X-API-Key": `${apiKey}`,
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

export async function listSocialSets(): Promise<SocialSetListItem[]> {
  return requestJson<SocialSetListItem[]>("/v1/accounts", {
    method: "GET",
  });
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
  searchParams.append("account", String(socialSetId));

  if (params.status && params.status !== "all") {
    searchParams.append("status", params.status.toUpperCase());
  }
  if (params.tags && params.tags.length > 0) {
    const firstTagId = Number(params.tags[0]);
    if (Number.isFinite(firstTagId)) {
      searchParams.append("tag_id", String(firstTagId));
    }
  }
  const size = params.limit ?? DEFAULT_PAGE_SIZE;
  searchParams.append("size", String(size));

  const offset = params.offset ?? 0;
  const page = Math.floor(offset / size) + 1;
  searchParams.append("page", String(page));

  const queryString = searchParams.toString();
  const response = await requestJson<PaginatedUserPostsResponse>(`/v1/posts?${queryString}`, {
    method: "GET",
  });

  const results: DraftListItem[] = response.data.map((post) => {
    // private_url is always the owner's direct link to the draft.
    // share_url is only populated when a share_id exists (public/shared view).
    const ownerUrl = `${APP_BASE}?d=${post.post_id}`;
    const shareUrl = post.share_id ? `${APP_BASE}/s/${encodeURIComponent(post.share_id)}` : null;

    return {
      id: post.post_id,
      social_set_id: post.account_id,
      status: mapUserPostStatus(post.status),
      draft_title: post.title ?? null,
      preview: post.title ?? null,
      socials: post.socials ?? [],
      private_url: ownerUrl,
      share_url: shareUrl,
      tags: extractPostTags(post.tags),
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at ?? null,
      scheduled_date: post.scheduled_date ?? null,
    };
  });

  return {
    results,
    count: response.total,
    limit: response.size,
    offset: (response.page - 1) * response.size,
    next: response.page < response.total_pages ? String(response.page + 1) : null,
    previous: response.page > 1 ? String(response.page - 1) : null,
  } satisfies PagedResponse<DraftListItem>;
}

function extractPostTags(rawTags?: unknown[]): string[] {
  if (!rawTags || rawTags.length === 0) {
    return [];
  }

  const resolved = rawTags
    .map((tag) => {
      if (typeof tag === "string") {
        return tag;
      }
      if (tag && typeof tag === "object") {
        const record = tag as Record<string, unknown>;
        if (typeof record.name === "string" && record.name.trim()) {
          return record.name;
        }
        if (typeof record.tag === "string" && record.tag.trim()) {
          return record.tag;
        }
        if (typeof record.tag_id === "number") {
          return String(record.tag_id);
        }
      }
      return undefined;
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(resolved));
}

function mapUserPostStatus(status: UserPostStatus): DraftListItem["status"] {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "SCHEDULED":
      return "scheduled";
    case "PUBLISHED":
      return "published";
    case "PUBLISHING":
      return "publishing";
    case "ERROR":
      return "error";
    default:
      return "draft";
  }
}

export async function getDraft(draftId: number) {
  return requestJson<DraftDetail>(`/v1/posts/${draftId}`, { method: "GET" });
}

export async function getParsedPostContent(platform: string, postId: number) {
  const normalizedPlatform = platform.toUpperCase();
  const query = new URLSearchParams({
    platform: normalizedPlatform,
    post_id: String(postId),
  }).toString();

  const response = await requestJson<ParsedPostContent | { text?: string | string[]; media?: string | string[] }>(
    `/v1/posts/parsed/content?${query}`,
    {
      method: "GET",
    },
  );
  return normalizeParsedContent(response);
}

function normalizeParsedContent(
  content: ParsedPostContent | { text?: string | string[]; media?: string | string[] },
): ParsedPostContent {
  const text = Array.isArray(content.text) ? content.text : content.text ? [content.text] : [];
  const media = Array.isArray(content.media) ? content.media : content.media ? [content.media] : [];
  return { text, media };
}

// POST /v1/posts/raw returns a single DraftDetailResponse per the OpenAPI spec.
export async function createDraft(payload: CreateRawDraftRequest): Promise<DraftDetail> {
  return requestJson<DraftDetail>("/v1/posts/raw", {
    method: "POST",
    body: payload,
  });
}

// NOTE: The OpenAPI spec only documents GET for /v1/posts/{draft_id}; the PATCH
// method is absent from the spec paths. However, the DraftUpdateRequest schema
// (which includes publish_at) is defined in the spec, indicating the endpoint
// exists but has not yet been added to the path documentation.
export async function scheduleDraft(draftId: number, socialSetId: number, publishAt: string) {
  const body: Pick<DraftUpdateRequest, "publish_at"> = { publish_at: publishAt };
  return requestJson<{
    id?: number;
    social_set_id?: number;
    status?: string;
    scheduled_date?: string | null;
    private_url?: string | null;
  }>(`/v1/posts/${draftId}?account=${socialSetId}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteDraft(socialSetId: number, draftId: number) {
  await requestJson<void>(`/v1/posts?account=${socialSetId}`, {
    method: "DELETE",
    body: [draftId],
  });
}

export async function getMediaStatus(socialSetId: number, mediaId: string) {
  return requestJson<MediaStatus>(`/v2/social-sets/${socialSetId}/media/${mediaId}`, { method: "GET" });
}

export async function listTags(socialSetId: number) {
  const response = await requestJson<unknown>(`/v1/tags?account=${socialSetId}`, {
    method: "GET",
  });

  const responseObject =
    response && typeof response === "object" ? (response as { data?: Tags[]; results?: Tags[] }) : undefined;
  const rawItems = Array.isArray(response) ? response : (responseObject?.data ?? responseObject?.results ?? []);
  return rawItems
    .map((tag) => {
      const record = tag as Tags;
      const normalizedTag = record.tag;
      if (!normalizedTag || typeof normalizedTag !== "string") {
        return undefined;
      }
      return {
        tag_id: typeof record.tag_id === "number" ? record.tag_id : Number(record.tag_id ?? 0),
        tag: normalizedTag,
        color: typeof record.color === "string" ? record.color : "",
      } satisfies Tags;
    })
    .filter((tag): tag is Tags => Boolean(tag));
}
