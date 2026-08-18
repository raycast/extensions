/**
 * Minimal Postproxy REST client for the Raycast extension.
 *
 * - GET list screens use `useFetch` directly with `authHeaders()` + `normalizeList`.
 * - Mutations go through `request()`, which throws `Error(apiMessage)` so
 *   `showFailureToast(err)` surfaces the real backend message.
 *
 * Base URL, auth, pagination and error shapes are ported from the Postproxy MCP
 * client (postproxy-mcp/src/api/client.ts) and verified against the Rails jbuilder views.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename } from "node:path";
import { prefs } from "./prefs";

export const BASE_URL = "https://api.postproxy.dev/api";
export const APP_URL = "https://app.postproxy.dev";

/** Absolute API URL for a given path (starts with "/"). */
export const api = (path: string) => `${BASE_URL}${path}`;

/** Auth + optional extra headers. The API key is only ever read here. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: `Bearer ${prefs().apiKey}`, ...extra };
}

/**
 * Normalize a list response into an array.
 * The API returns a bare array, `{ data: [...] }`, or `{ total, page, per_page, data }`.
 */
export function normalizeList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
}

/** Parse the Postproxy error envelope into a single human-readable message. */
async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      errors?: string[];
      message?: string;
      error?: unknown;
    };
    if (Array.isArray(body?.errors) && body.errors.length > 0) return body.errors.join("; ");
    if (body?.message) return body.message;
    if (typeof body?.error === "string") return body.error;
  } catch {
    // response was not JSON
  }
  if (res.status === 401) return "Invalid API key. Check your Postproxy API key in the extension preferences.";
  return res.statusText || `Request failed (${res.status})`;
}

/** Imperative JSON request for mutations. Throws Error(apiMessage) on failure. */
export async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(api(path), {
    method,
    headers: authHeaders({ "Content-Type": "application/json", ...extraHeaders }),
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const contentType = res.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? ((await res.json()) as T) : ({} as T);
}

/** A media entry is a local file (vs a remote URL) when it looks like a filesystem path. */
function isLocalFile(m: string): boolean {
  return m.startsWith("/") || m.startsWith("~") || m.startsWith("file:");
}

function expandPath(p: string): string {
  const withoutScheme = p.replace(/^file:\/\//, "");
  return withoutScheme.startsWith("~") ? withoutScheme.replace("~", homedir()) : withoutScheme;
}

export interface CreatePostInput {
  body: string;
  /** Platform names (e.g. "twitter") or profile IDs. */
  profiles: string[];
  /** Remote URLs and/or absolute local file paths. */
  media?: string[];
  /** ISO 8601 timestamp for scheduling. */
  scheduledAt?: string;
  draft?: boolean;
  /** Per-platform parameters, e.g. { instagram: { format: "reel" }, facebook: { page_id: "…" } }. */
  platforms?: Record<string, unknown>;
}

/** Append a nested value using Rails bracket notation (for multipart form data). */
function appendNested(form: FormData, prefix: string, value: unknown): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) appendNested(form, `${prefix}[]`, item);
  } else if (typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      appendNested(form, `${prefix}[${key}]`, val);
    }
  } else {
    form.append(prefix, String(value));
  }
}

export interface CreatePostResult {
  id: string;
  status: string;
  draft: boolean;
}

/** POST /posts — JSON body, or multipart when any media entry is a local file. */
export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  const media = input.media ?? [];
  const hasFiles = media.some(isLocalFile);

  if (!hasFiles) {
    const payload = {
      post: {
        body: input.body,
        ...(input.scheduledAt ? { scheduled_at: input.scheduledAt } : {}),
        ...(input.draft != null ? { draft: input.draft } : {}),
      },
      profiles: input.profiles,
      media,
      ...(input.platforms && Object.keys(input.platforms).length > 0 ? { platforms: input.platforms } : {}),
    };
    return request<CreatePostResult>("POST", "/posts", payload);
  }

  // Multipart — Rails bracket field names (mirrors MCP createPostWithFiles).
  const form = new FormData();
  form.append("post[body]", input.body);
  if (input.scheduledAt) form.append("post[scheduled_at]", input.scheduledAt);
  if (input.draft != null) form.append("post[draft]", String(input.draft));
  for (const profile of input.profiles) form.append("profiles[]", profile);
  for (const item of media) {
    if (isLocalFile(item)) {
      const path = expandPath(item);
      const buffer = await readFile(path);
      form.append("media[]", new Blob([new Uint8Array(buffer)]), basename(path));
    } else {
      form.append("media[]", item);
    }
  }
  if (input.platforms && Object.keys(input.platforms).length > 0) {
    appendNested(form, "platforms", input.platforms);
  }

  // No Content-Type header — fetch sets the multipart boundary itself.
  const res = await fetch(api("/posts"), {
    method: "POST",
    headers: authHeaders(),
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CreatePostResult;
}

// --- Thin mutation helpers used across views -------------------------------

export const publishDraft = (postId: string) => request("POST", `/posts/${postId}/publish`);

export const deletePost = (postId: string, onPlatform = false) =>
  request("DELETE", `/posts/${postId}${onPlatform ? "?delete_on_platform=true" : ""}`);

export const replyComment = (postId: string, profileId: string, text: string, parentId?: string) =>
  request("POST", `/posts/${postId}/comments?profile_id=${profileId}`, {
    text,
    ...(parentId ? { parent_id: parentId } : {}),
  });

export type CommentAction = "hide" | "unhide" | "like" | "unlike";

export const commentAction = (postId: string, commentId: string, profileId: string, action: CommentAction) =>
  request("POST", `/posts/${postId}/comments/${commentId}/${action}?profile_id=${profileId}`);

export const deleteComment = (postId: string, commentId: string, profileId: string) =>
  request("DELETE", `/posts/${postId}/comments/${commentId}?profile_id=${profileId}`);

export const profileCommentReply = (profileId: string, parentId: string, text: string) =>
  request("POST", `/profiles/${profileId}/comments`, { text, parent_id: parentId });

export const deleteProfileComment = (profileId: string, commentId: string) =>
  request("DELETE", `/profiles/${profileId}/comments/${commentId}`);

export const sendMessage = (chatId: string, body: string) => request("POST", `/chats/${chatId}/messages`, { body });

export const reactMessage = (messageId: string, reaction: string) =>
  request("POST", `/messages/${messageId}/react`, { reaction });

export const unreactMessage = (messageId: string) => request("DELETE", `/messages/${messageId}/unreact`);
