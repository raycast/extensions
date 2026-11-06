// A small client for the public BulkPublish REST API (https://www.bulkpublish.com/developers/).
import { getPreferenceValues } from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  API_BASE,
  apiErrorMessage,
  buildPostBody,
  Channel,
  isRecord,
  MediaKind,
  mimeFromName,
  parseChannel,
  parsePost,
  Post,
  PostStatus,
} from "./core";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function apiKey(): string {
  return getPreferenceValues<Preferences>().apiKey.trim();
}

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${apiKey()}`, Accept: "application/json" };
}

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const headers = authHeaders();
  let payload: string | FormData | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Couldn't reach BulkPublish. Check your connection and try again.");
  }
  let text: string;
  try {
    text = await res.text();
  } catch {
    // The connection dropped after BulkPublish started replying, so the request may have gone through.
    throw new ApiError(0, "The connection to BulkPublish dropped before it finished replying.");
  }
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON.
  }
  if (!res.ok) throw new ApiError(res.status, apiErrorMessage(res.status, data));
  return data;
}

/** Shared by useFetch callers so errors read the same everywhere. */
export async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON.
  }
  if (!res.ok) throw new ApiError(res.status, apiErrorMessage(res.status, data));
  return data;
}

export const url = (path: string, params?: Record<string, string | number | undefined>) => {
  const u = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  return u.toString();
};

// ── Channels ──

export function channelsFromResponse(data: unknown): Channel[] {
  const list = isRecord(data) && Array.isArray(data.channels) ? data.channels : [];
  return list.map(parseChannel).filter((c): c is Channel => c !== null);
}

export async function listChannels(): Promise<Channel[]> {
  return channelsFromResponse(await request("GET", "/api/channels"));
}

// ── Posts ──

export interface PostPage {
  posts: Post[];
  page: number;
  totalPages: number;
}

export function postsFromResponse(data: unknown): PostPage {
  const list = isRecord(data) && Array.isArray(data.posts) ? data.posts : [];
  return {
    posts: list.map(parsePost).filter((p): p is Post => p !== null),
    page: isRecord(data) ? Number(data.page) || 1 : 1,
    totalPages: isRecord(data) ? Number(data.totalPages) || 1 : 1,
  };
}

export interface PostQuery {
  status?: PostStatus;
  search?: string;
  channelId?: number;
  approvalStatus?: string;
  order?: "asc" | "desc";
  limit?: number;
  page?: number;
}

export function postsUrl(q: PostQuery): string {
  return url("/api/posts", {
    status: q.status,
    search: q.search,
    channelId: q.channelId,
    approvalStatus: q.approvalStatus,
    order: q.order ?? "desc",
    limit: q.limit ?? 25,
    page: q.page ?? 1,
  });
}

export async function createPost(body: ReturnType<typeof buildPostBody>): Promise<number> {
  const data = await request("POST", "/api/posts", body);
  // The new post comes back at the top level.
  const id = isRecord(data) ? Number(data.id) : NaN;
  if (!Number.isInteger(id)) throw new ApiError(0, "BulkPublish didn't return the new post.");
  return id;
}

export const publishPost = (id: number) => request("POST", `/api/posts/${id}/publish`);
export const retryPost = (id: number) => request("POST", `/api/posts/${id}/retry`, {});
export const deletePost = (id: number) => request("DELETE", `/api/posts/${id}`);
/** Moves a scheduled post back to drafts. */
export const unschedulePost = (id: number) => request("PUT", `/api/posts/${id}`, { status: "draft" });

/** The next free time in the user's posting queue. */
export async function nextQueueSlot(timezone: string): Promise<string> {
  const data = await request("GET", `/api/posts/queue-slot?timezone=${encodeURIComponent(timezone)}`);
  const t = isRecord(data) ? data.suggestedTime : null;
  if (typeof t !== "string" || Number.isNaN(Date.parse(t)))
    throw new ApiError(0, "BulkPublish couldn't find a free queue slot. Set up your queue times in BulkPublish.");
  return t;
}

// ── Media ──

export async function uploadMedia(path: string): Promise<number> {
  const name = basename(path);
  const mimeType = mimeFromName(name);
  if (!mimeType) throw new ApiError(0, `${name} isn't an image or video BulkPublish can post.`);
  const info = await stat(path);
  if (info.size > MAX_UPLOAD_BYTES) throw new ApiError(0, `${name} is larger than 100 MB. Upload it in BulkPublish.`);
  const bytes = await readFile(path);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), name);
  const data = await request("POST", "/api/media", form);
  const id = isRecord(data) && isRecord(data.file) ? Number(data.file.id) : NaN;
  if (!Number.isInteger(id)) throw new ApiError(0, "BulkPublish didn't return the uploaded file.");
  return id;
}

export const deleteMedia = (id: number) => request("DELETE", `/api/media/${id}`);

// ── Sending ──

export type SendMode = "now" | "queue" | "schedule" | "draft";

export interface SendRequest {
  content: string;
  targets: Channel[];
  files: string[];
  media: MediaKind;
  mode: SendMode;
  schedule?: { scheduledAt: string; timezone: string };
}

/**
 * Thrown when the post was created but publishing it failed or its result is unknown.
 * The post and its media are kept, so the caller can check or retry that same post.
 */
export class PostKeptError extends ApiError {
  constructor(
    public postId: number,
    /** True when BulkPublish may already be publishing (no clear answer came back). */
    public uncertain: boolean,
    cause: ApiError,
  ) {
    super(
      cause.status,
      uncertain
        ? "BulkPublish may already be publishing it, but no reply came back. Check the post before trying again."
        : `${cause.message} The post was kept in BulkPublish.`,
    );
    this.name = "PostKeptError";
  }
}

/** A clear "no" from BulkPublish: it answered with a 4xx, so the request wasn't carried out. */
function isRejection(e: unknown): boolean {
  return e instanceof ApiError && e.status >= 400 && e.status < 500;
}

/**
 * Upload, create and (for "now") publish.
 * - If an upload or creating the post is clearly rejected, the uploads are removed.
 * - If the reply to creating the post is lost, the uploads are kept, as the post may exist and use them.
 * - Once publishing has been requested, the post and its uploads are never removed: publishing
 *   may have started, and deleting it would drop its tracking record. A PostKeptError is thrown instead.
 */
export async function sendPost(r: SendRequest, onStep?: (step: string) => void): Promise<number> {
  const mediaIds: number[] = [];
  let creating = false;
  let postId: number;
  try {
    for (const [i, f] of r.files.entries()) {
      onStep?.(r.files.length > 1 ? `Uploading ${i + 1} of ${r.files.length}…` : "Uploading media…");
      mediaIds.push(await uploadMedia(f));
    }
    onStep?.(r.mode === "now" ? "Publishing…" : "Saving…");
    creating = true;
    postId = await createPost(buildPostBody(r.targets, r.content, mediaIds, r.media, r.schedule));
  } catch (e) {
    // No post exists yet, or BulkPublish clearly refused to create it: the uploads aren't used by anything.
    if (!creating || isRejection(e)) for (const id of mediaIds) await deleteMedia(id).catch(() => undefined);
    throw e;
  }
  if (r.mode === "now") {
    try {
      await publishPost(postId);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, (e as Error).message);
      throw new PostKeptError(postId, !isRejection(err), err);
    }
  }
  return postId;
}
