import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

import {
  CONNECTION_STATUS,
  POST_STATUS,
  PUBLISH_MODE,
  type Connection,
  type ExtensionPreferences,
  type PaginatedResponse,
  type Post,
  type PostCreateBody,
  type PostStatus,
  type UploadTicket,
} from "./types";

const DEFAULT_API_BASE_URL = "https://www.shortsync.app/api/v1";
const DEFAULT_APP_URL = "https://www.shortsync.app";

/** Raised for every non-2xx answer from the ShortSync API. */
export class ShortSyncError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string,
    retryAfterSeconds?: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ShortSyncError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.details = details;
  }
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ShortSyncError && (error.status === 401 || error.code === "WORKSPACE_HEADER_REQUIRED");
}

function apiBaseUrl(): string {
  const { apiBaseUrl } = getPreferenceValues<ExtensionPreferences>();
  const trimmed = (apiBaseUrl ?? "").trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_API_BASE_URL;
}

/**
 * The ShortSync web app that belongs to the configured API. The API lives at
 * `<app>/api/v1`, or on the `api.` subdomain of the app's `www.` host.
 */
export function appUrl(pathAndQuery = ""): string {
  let origin = DEFAULT_APP_URL;
  try {
    const url = new URL(apiBaseUrl());
    origin = url.hostname.startsWith("api.")
      ? `${url.protocol}//www.${url.hostname.slice(4)}${url.port ? `:${url.port}` : ""}`
      : url.origin;
  } catch {
    // Keep the default for a malformed preference.
  }
  return `${origin}${pathAndQuery}`;
}

export const APP_LINKS = {
  dashboard: () => appUrl("/dashboard"),
  scheduled: () => appUrl("/dashboard?tab=library&filter=scheduled"),
  failed: () => appUrl("/dashboard?tab=library&filter=failed"),
  published: () => appUrl("/dashboard?tab=library&filter=published"),
  connections: () => appUrl("/dashboard?tab=connections"),
  apiSettings: () => appUrl("/settings?section=api_mcp"),
};

function apiKey(): string {
  return getPreferenceValues<ExtensionPreferences>().apiKey.trim();
}

async function request<T>(
  method: string,
  pathAndQuery: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${pathAndQuery}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ShortSyncError("Couldn't reach ShortSync. Check your internet connection.", 0, "NETWORK_ERROR");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // Non-JSON body (e.g. a proxy error page); handled below.
  }

  if (!response.ok) {
    const body = (json ?? {}) as { code?: string; message?: string; details?: Record<string, unknown> };
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new ShortSyncError(
      body.message || `ShortSync answered with HTTP ${response.status}.`,
      response.status,
      body.code || `HTTP_${response.status}`,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      body.details,
    );
  }

  return json as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// Connections

/** Every connection in the workspace (follows pagination). */
export async function listConnections(): Promise<Connection[]> {
  const all: Connection[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await request<PaginatedResponse<Connection>>("GET", `/connections${query({ limit: 100, cursor })}`);
    all.push(...res.data);
    cursor = res.pagination?.next_cursor ?? undefined;
    if (!cursor) break;
  }
  return all;
}

/** Connections a post can go to right now. */
export function isPostable(connection: Connection): boolean {
  return connection.isActive !== false && connection.status === CONNECTION_STATUS.Active;
}

// ---------------------------------------------------------------------------
// Posts

export async function listPosts(params: {
  status: PostStatus[];
  sort?: "created_at" | "scheduled_for";
  createdAfter?: string;
  limit?: number;
  cursor?: string;
}): Promise<PaginatedResponse<Post>> {
  return request<PaginatedResponse<Post>>(
    "GET",
    `/posts${query({
      status: params.status.join(","),
      sort: params.sort,
      created_after: params.createdAfter,
      limit: params.limit ?? 25,
      cursor: params.cursor,
    })}`,
  );
}

export async function listScheduledPosts(limit: number, cursor?: string) {
  return listPosts({ status: [POST_STATUS.Scheduled], sort: "scheduled_for", limit, cursor });
}

/** How far back failed posts count as "needs attention". */
export const FAILED_LOOKBACK_DAYS = 30;

/**
 * Failed posts from the last FAILED_LOOKBACK_DAYS days that need action.
 * Posts stopped as duplicates or skipped by a daily limit stay `failed` but
 * need nothing from the user, so they're left out.
 */
export async function listFailedPosts(limit: number, cursor?: string) {
  const createdAfter = new Date(Date.now() - FAILED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const res = await listPosts({ status: [POST_STATUS.Failed], sort: "created_at", createdAfter, limit, cursor });
  return { ...res, data: res.data.filter(needsAttention) };
}

export function needsAttention(post: Post): boolean {
  return post.status === POST_STATUS.Failed && !post.duplicate_of && !post.skipped;
}

export async function createPosts(body: PostCreateBody): Promise<Post[]> {
  const res = await request<{ data: Post[] }>("POST", "/posts", {
    body,
    headers: { "Idempotency-Key": randomUUID() },
  });
  return res.data;
}

export async function publishPostNow(postId: string): Promise<Post> {
  return request<Post>("PATCH", `/posts/${encodeURIComponent(postId)}`, {
    body: { publish_mode: PUBLISH_MODE.Immediate },
  });
}

export async function retryPost(postId: string): Promise<Post> {
  return request<Post>("POST", `/posts/${encodeURIComponent(postId)}/retry`, { body: {} });
}

export async function cancelPost(postId: string): Promise<void> {
  await request<void>("DELETE", `/posts/${encodeURIComponent(postId)}`);
}

// ---------------------------------------------------------------------------
// Uploads

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".gif": "image/gif",
};

export const SUPPORTED_EXTENSIONS = Object.keys(CONTENT_TYPES);

export function contentTypeFor(filePath: string): string | undefined {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()];
}

export function isVideoFile(filePath: string): boolean {
  return contentTypeFor(filePath)?.startsWith("video/") ?? false;
}

const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** Client-side check before any bytes move. Returns an error message or undefined. */
export function validateMediaFile(filePath: string): string | undefined {
  const contentType = contentTypeFor(filePath);
  if (!contentType) {
    return `ShortSync takes ${SUPPORTED_EXTENSIONS.map((e) => e.slice(1)).join(", ")} files.`;
  }
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    return "Couldn't read that file.";
  }
  if (contentType.startsWith("video/") && size > MAX_VIDEO_BYTES) return "Videos can be up to 2 GB.";
  if (contentType.startsWith("image/") && size > MAX_IMAGE_BYTES) return "Images can be up to 20 MB.";
  return undefined;
}

/**
 * Uploads a local file: reserve a slot (POST /uploads), PUT the bytes to the
 * presigned URL, then GET /uploads/{id}, which finalizes and validates it.
 * Returns the upload id for POST /posts.
 */
export async function uploadFile(filePath: string, onProgress?: (fraction: number) => void): Promise<string> {
  const contentType = contentTypeFor(filePath);
  if (!contentType) throw new ShortSyncError(validateMediaFile(filePath) ?? "Unsupported file.", 0, "UNSUPPORTED");

  // Strip anything the API refuses in a filename (control characters).
  const filename =
    Array.from(path.basename(filePath))
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 0x20 && code !== 0x7f;
      })
      .join("")
      .slice(0, 255) || "upload";
  const ticket = await request<UploadTicket>("POST", "/uploads", { body: { filename } });

  await putFile(
    ticket.presigned_url,
    filePath,
    {
      "Content-Type": contentType,
      ...(ticket.required_headers ?? {}),
    },
    onProgress,
  );

  // First GET after the PUT finalizes the upload (type, size, storage quota).
  await request<unknown>("GET", `/uploads/${encodeURIComponent(ticket.upload_id)}`);
  return ticket.upload_id;
}

/** Streams the file to S3 with a Content-Length, reporting progress. */
function putFile(
  url: string,
  filePath: string,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const size = statSync(filePath).size;
  const target = new URL(url);
  const transport = target.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      { method: "PUT", headers: { ...headers, "Content-Length": String(size) } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) resolve();
          else
            reject(
              new ShortSyncError(
                `The file upload was refused (HTTP ${status}). Try again.`,
                status,
                "UPLOAD_PUT_FAILED",
              ),
            );
        });
      },
    );
    req.on("error", () =>
      reject(new ShortSyncError("The file upload was interrupted. Try again.", 0, "UPLOAD_PUT_FAILED")),
    );

    let sent = 0;
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => {
      sent += chunk.length;
      if (size > 0) onProgress?.(sent / size);
    });
    stream.on("error", () => {
      req.destroy();
      reject(new ShortSyncError("Couldn't read that file.", 0, "FILE_READ_FAILED"));
    });
    stream.pipe(req);
  });
}
