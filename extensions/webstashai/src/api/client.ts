import { getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS,
  WEBSTASH_UPGRADE_URL,
} from "../constants";
import type {
  ApiErrorBody,
  CheckPageResponse,
  CollectionPagesResponse,
  CollectionsListResponse,
  CreateHighlightRequest,
  Highlight,
  HighlightsListResponse,
  ImportJobResponse,
  ImportResponse,
  ListPagesOptions,
  PageDetailResponse,
  PageNote,
  PagesListResponse,
  QuotaInfo,
  ReindexResponse,
  RelatedPagesResponse,
  ReviewDeckResponse,
  ReviewFeedbackAction,
  ReviewFrequency,
  ReviewPreferences,
  ReviewSourcesResponse,
  SavePageResponse,
  SearchResult,
  StatsResponse,
  SynthesizeResponse,
  TagIndexResponse,
  TagJobResponse,
  TagRenameRequest,
  TagRenameResult,
  UpdatePageFields,
} from "../types";

interface Preferences {
  apiKey: string;
}

let lastRequestId: string | null = null;
let lastQuota: QuotaInfo | null = null;

export function getLastRequestId(): string | null {
  return lastRequestId;
}

export function getLastQuota(): QuotaInfo | null {
  return lastQuota;
}

function getApiKey(): string {
  return getPreferenceValues<Preferences>().apiKey;
}

const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

/**
 * Low-level fetch wrapper with auth, timeout, retry, and error handling.
 */
async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    query?: Record<string, string | undefined>;
    signal?: AbortSignal;
    idempotencyKey?: string;
    /** Send a raw string body with an explicit content type (bypasses JSON serialization). */
    rawBody?: string;
    contentType?: string;
  },
): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(path, API_BASE_URL);

  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }

  let bodyStr: string | undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (options?.rawBody !== undefined) {
    bodyStr = options.rawBody;
    headers["Content-Type"] = options.contentType ?? "text/plain";
  } else if (options?.body !== undefined) {
    bodyStr = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }

  if (options?.idempotencyKey)
    headers["Idempotency-Key"] = options.idempotencyKey;

  let lastError: Error | undefined;

  // Up to 2 retries for transient errors
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Link external signal to our controller
    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timer);
        throw new Error("Request aborted");
      }
      options.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method,
        headers,
        body: bodyStr,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        if (options?.signal?.aborted) {
          throw new Error("Request aborted");
        }
        throw new Error(
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        );
      }
      throw new Error("Network error — check your internet connection");
    } finally {
      clearTimeout(timer);
    }

    // Extract response headers
    lastRequestId = res.headers.get("x-request-id");
    const pagesUsed = res.headers.get("webstash-pages-used");
    if (pagesUsed !== null) {
      lastQuota = {
        pages_used: Number(pagesUsed),
        pages_limit: numberOrNull(res.headers.get("webstash-pages-limit")),
        ai_used: Number(res.headers.get("webstash-ai-used") ?? 0),
        ai_limit: numberOrNull(res.headers.get("webstash-ai-limit")),
      };
    }

    if (res.status === 204) return null as T;

    let json: Record<string, unknown>;
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      if (res.ok) return null as T;
      throw new Error(`HTTP ${res.status} (no response body)`);
    }

    if (res.ok) return json as T;

    // Handle specific error codes
    const errorBody = json as unknown as ApiErrorBody;

    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter && attempt === 0) {
        const delaySec = parseInt(retryAfter, 10) || 5;
        await new Promise((r) => setTimeout(r, delaySec * 1000));
        continue;
      }
      throw new ApiRequestError(429, errorBody, lastRequestId);
    }

    if (TRANSIENT_STATUS_CODES.has(res.status) && attempt < 2) {
      lastError = new ApiRequestError(res.status, errorBody, lastRequestId);
      continue;
    }

    throw new ApiRequestError(res.status, errorBody, lastRequestId);
  }

  throw lastError ?? new Error("Request failed after retries");
}

// ── Public API functions ────────────────────────────────────────

export function searchPages(query: string, signal?: AbortSignal) {
  return request<{ results: SearchResult[] }>("POST", "/search", {
    body: { query },
    signal,
  });
}

export function getAuthMe(signal?: AbortSignal) {
  return request<import("../types").AuthMeResponse>("GET", "/auth/me", {
    signal,
  });
}

export function listPages(opts: ListPagesOptions = {}, signal?: AbortSignal) {
  const query: Record<string, string | undefined> = {
    limit: String(opts.limit ?? 50),
    cursor: opts.cursor,
    status: opts.status,
    domain: opts.domain,
    tag: opts.tag,
    is_favorite:
      opts.is_favorite !== undefined ? String(opts.is_favorite) : undefined,
    is_pinned:
      opts.is_pinned !== undefined ? String(opts.is_pinned) : undefined,
    after: opts.after,
    before: opts.before,
    q: opts.q,
  };
  return request<PagesListResponse>("GET", "/pages", { query, signal });
}

export function getPage(id: string, signal?: AbortSignal) {
  return request<PageDetailResponse>(
    "GET",
    `/pages/${encodeURIComponent(id)}`,
    { signal },
  );
}

export function getRelatedPages(id: string, limit = 5, signal?: AbortSignal) {
  return request<RelatedPagesResponse>(
    "GET",
    `/pages/${encodeURIComponent(id)}/related`,
    { query: { limit: String(limit) }, signal },
  );
}

export function checkPage(url: string, signal?: AbortSignal) {
  return request<CheckPageResponse>("GET", "/check", {
    query: { url },
    signal,
  });
}

export function savePage(
  url: string,
  title: string | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return request<SavePageResponse>("POST", "/save", {
    body: { url, title: title || undefined },
    idempotencyKey,
    signal,
  });
}

// ── Phase 4: Page Management ──────────────────────────────────

export function updatePage(
  id: string,
  fields: UpdatePageFields,
  signal?: AbortSignal,
) {
  return request<PageDetailResponse>(
    "PATCH",
    `/pages/${encodeURIComponent(id)}`,
    { body: fields, signal },
  );
}

export function updatePageTags(
  id: string,
  tags: string[],
  signal?: AbortSignal,
) {
  return request<PageDetailResponse>(
    "PATCH",
    `/pages/${encodeURIComponent(id)}/tags`,
    { body: { tags }, signal },
  );
}

export function deletePage(id: string, signal?: AbortSignal) {
  return request<null>("DELETE", `/pages/${encodeURIComponent(id)}`, {
    signal,
  });
}

export function addNote(pageId: string, content: string, signal?: AbortSignal) {
  return request<PageNote>(
    "POST",
    `/pages/${encodeURIComponent(pageId)}/notes`,
    { body: { content }, signal },
  );
}

export function reindexPage(id: string, signal?: AbortSignal) {
  return request<ReindexResponse>(
    "POST",
    `/pages/${encodeURIComponent(id)}/reindex`,
    { signal },
  );
}

// ── Phase 5: Highlights ─────────────────────────────────────────

export function listHighlights(
  opts: { cursor?: string; limit?: number; q?: string; url?: string } = {},
  signal?: AbortSignal,
) {
  const query: Record<string, string | undefined> = {
    limit: String(opts.limit ?? 20),
    cursor: opts.cursor,
    q: opts.q,
    url: opts.url,
  };
  return request<HighlightsListResponse>("GET", "/highlights", {
    query,
    signal,
  });
}

export function createHighlight(
  pageId: string,
  input: CreateHighlightRequest,
  signal?: AbortSignal,
) {
  return request<Highlight>(
    "POST",
    `/pages/${encodeURIComponent(pageId)}/highlights`,
    { body: input, signal },
  );
}

export function deleteHighlight(highlightId: string, signal?: AbortSignal) {
  return request<null>(
    "DELETE",
    `/highlights/${encodeURIComponent(highlightId)}`,
    { signal },
  );
}

// ── Phase 6: Tags + Collections ─────────────────────────────────

export function listTags(signal?: AbortSignal) {
  return request<TagIndexResponse>("GET", "/tags", { signal });
}

export function renameTag(
  body: TagRenameRequest,
  dryRun = false,
  signal?: AbortSignal,
) {
  return request<TagRenameResult>("POST", "/tags/rename", {
    body,
    query: dryRun ? { dry_run: "true" } : undefined,
    signal,
  });
}

export function mergeTag(
  body: TagRenameRequest,
  dryRun = false,
  signal?: AbortSignal,
) {
  return request<TagRenameResult>("POST", "/tags/rename", {
    body,
    query: dryRun ? { dry_run: "true" } : undefined,
    signal,
  });
}

export function getTagJob(jobId: string, signal?: AbortSignal) {
  return request<TagJobResponse>(
    "GET",
    `/tags/jobs/${encodeURIComponent(jobId)}`,
    { signal },
  );
}

export function listCollections(signal?: AbortSignal) {
  return request<CollectionsListResponse>("GET", "/collections", { signal });
}

export function getCollectionPages(
  tag: string,
  opts: { limit?: number; cursor?: number } = {},
  signal?: AbortSignal,
) {
  const query: Record<string, string | undefined> = {
    limit: String(opts.limit ?? 20),
    cursor: opts.cursor !== undefined ? String(opts.cursor) : undefined,
  };
  return request<CollectionPagesResponse>(
    "GET",
    `/collections/${encodeURIComponent(tag)}/pages`,
    { query, signal },
  );
}

// ── Phase 7: Review / Spaced Repetition ────────────────────────

export function getReviewDeck(limit?: number, signal?: AbortSignal) {
  const query: Record<string, string | undefined> = {
    limit: limit !== undefined ? String(limit) : undefined,
  };
  return request<ReviewDeckResponse>("GET", "/review", { query, signal });
}

export function submitReviewFeedback(
  highlightId: string,
  action: ReviewFeedbackAction,
  signal?: AbortSignal,
) {
  return request<{ next_review_at?: string; discarded?: true }>(
    "POST",
    `/review/${encodeURIComponent(highlightId)}`,
    { body: { action }, signal },
  );
}

export function getReviewPreferences(signal?: AbortSignal) {
  return request<ReviewPreferences>("GET", "/review/preferences", { signal });
}

export function updateReviewPreferences(
  body: Partial<ReviewPreferences>,
  signal?: AbortSignal,
) {
  return request<ReviewPreferences>("PATCH", "/review/preferences", {
    body,
    signal,
  });
}

export function listReviewSources(
  opts: {
    type?: string;
    q?: string;
    sort?: string;
    order?: string;
    cursor?: string;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const query: Record<string, string | undefined> = {
    type: opts.type,
    q: opts.q,
    sort: opts.sort,
    order: opts.order,
    cursor: opts.cursor,
    limit: String(opts.limit ?? 20),
  };
  return request<ReviewSourcesResponse>("GET", "/review/sources", {
    query,
    signal,
  });
}

export function updatePageReviewFrequency(
  pageId: string,
  frequency: ReviewFrequency,
  signal?: AbortSignal,
) {
  return request<{ frequency: ReviewFrequency }>(
    "PATCH",
    `/pages/${encodeURIComponent(pageId)}/review-frequency`,
    { body: { frequency }, signal },
  );
}

// ── Phase 8: Synthesize + Stats ─────────────────────────────────

export function getStats(signal?: AbortSignal) {
  return request<StatsResponse>("GET", "/stats", { signal });
}

export function synthesize(query: string, signal?: AbortSignal) {
  return request<SynthesizeResponse>("POST", "/synthesize", {
    body: { query },
    signal,
  });
}

// ── Phase 9: Import ───────────────────────────────────────────

export function importBookmarks(
  content: string,
  contentType: "text/html" | "text/csv",
  signal?: AbortSignal,
) {
  return request<ImportResponse>("POST", "/import", {
    rawBody: content,
    contentType,
    signal,
  });
}

export function getImportJob(
  jobId: string,
  includeFailed = false,
  signal?: AbortSignal,
) {
  return request<ImportJobResponse>(
    "GET",
    `/import/${encodeURIComponent(jobId)}`,
    {
      query: includeFailed ? { include: "failed_items" } : undefined,
      signal,
    },
  );
}

// ── Error handling helpers ──────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
    public requestId: string | null,
  ) {
    super(body.error || `HTTP ${status}`);
    this.name = "ApiRequestError";
  }
}

/**
 * Handle API errors with appropriate toasts.
 * Returns true if the error was handled (caller should not show a generic toast).
 */
export async function handleApiError(error: unknown): Promise<boolean> {
  if (!(error instanceof ApiRequestError)) return false;

  if (error.status === 401) {
    await showFailureToast("Invalid API Key", {
      title: "Invalid API Key",
      message: "Check your API key in extension preferences",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return true;
  }

  if (error.status === 402) {
    const body = error.body;
    await showFailureToast("Quota Exceeded", {
      title: "Quota Exceeded",
      message: body.error || "You've reached your plan limit",
      primaryAction: {
        title: "Upgrade Plan",
        onAction: async () => {
          const { open } = await import("@raycast/api");
          await open(body.upgradeUrl || WEBSTASH_UPGRADE_URL);
        },
      },
    });
    return true;
  }

  if (error.status === 429) {
    await showFailureToast("Rate Limited", {
      title: "Rate Limited",
      message: "Too many requests — try again in a few seconds",
    });
    return true;
  }

  return false;
}

function numberOrNull(value: string | null): number | null {
  return value !== null ? Number(value) : null;
}
