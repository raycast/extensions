import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import type { BucketListing, Destination, Status, TemporaryLink, Upload, WatchedFolder, WatchedFolders } from "./types";

export const DEFAULT_PORT = 47913;
const CONNECTION_KEY = "connection";
const REQUEST_TIMEOUT_MS = 30_000;

export type Connection = {
  port: number;
  token: string;
};

export type AktarErrorKind =
  /** No token yet: run Connect to Aktar or set one in preferences. */
  | "not-connected"
  /** Aktar rejected the token (regenerated, or pasted wrong). */
  | "unauthorized"
  /** Nothing is listening: Aktar isn't running, is too old, or its local API is off. */
  | "not-running"
  /** Aktar answered with an error of its own (storage, validation, ...). */
  | "request-failed";

export class AktarError extends Error {
  constructor(
    readonly kind: AktarErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AktarError";
  }
}

export function isConnectionError(error: unknown): error is AktarError {
  return error instanceof AktarError && error.kind !== "request-failed";
}

// MARK: - Connection

/**
 * A token typed into the preferences wins; otherwise the one Aktar handed
 * over when the user approved Connect to Aktar.
 */
export async function getConnection(): Promise<Connection> {
  const preferences = getPreferenceValues<Preferences>();
  const manualToken = preferences.apiToken?.trim();
  if (manualToken) {
    const port = Number.parseInt(preferences.port ?? "", 10);
    return { token: manualToken, port: Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT };
  }

  const stored = await LocalStorage.getItem<string>(CONNECTION_KEY);
  if (stored) {
    try {
      const connection = JSON.parse(stored) as Connection;
      if (connection.token && connection.port) return connection;
    } catch {
      // Fall through to "not connected".
    }
  }
  throw new AktarError("not-connected", "This extension isn't connected to Aktar yet.");
}

export async function saveConnection(connection: Connection) {
  await LocalStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
}

// MARK: - Transport

type RequestOptions = {
  query?: Record<string, string | number | undefined | null>;
  json?: unknown;
  file?: { path: string; onProgress?: (fraction: number) => void };
  connection?: Connection;
  /** The reply's bytes instead of JSON: a Buffer, or null for 204 No Content. */
  binary?: boolean;
};

async function request<T>(method: string, route: string, options: RequestOptions = {}): Promise<T> {
  const connection = options.connection ?? (await getConnection());

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const query = search.toString();

  let body: Buffer | undefined;
  let fileSize = 0;
  const headers: Record<string, string | number> = {
    Authorization: `Bearer ${connection.token}`,
    Accept: "application/json",
  };
  if (options.file) {
    fileSize = (await stat(options.file.path)).size;
    headers["Content-Type"] = "application/octet-stream";
    headers["Content-Length"] = fileSize;
  } else if (options.json !== undefined) {
    body = Buffer.from(JSON.stringify(options.json));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = body.length;
  } else if (method !== "GET") {
    headers["Content-Length"] = 0;
  }

  return new Promise<T>((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: connection.port,
        method,
        path: `/v1/${route}${query ? `?${query}` : ""}`,
        headers,
        // Uploads can take as long as the storage provider needs.
        timeout: options.file ? 0 : REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (options.binary && status >= 200 && status < 300) {
            resolve((status === 204 ? null : Buffer.concat(chunks)) as T);
            return;
          }
          const text = Buffer.concat(chunks).toString("utf8");
          let payload: unknown;
          try {
            payload = text ? JSON.parse(text) : {};
          } catch {
            payload = {};
          }
          if (status >= 200 && status < 300) {
            resolve(payload as T);
            return;
          }
          const message = (payload as { error?: string }).error ?? `Aktar responded with HTTP ${status}.`;
          reject(new AktarError(status === 401 ? "unauthorized" : "request-failed", message, status));
        });
      },
    );

    req.on("timeout", () => req.destroy(new Error("Aktar took too long to respond.")));
    req.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ECONNREFUSED") {
        reject(new AktarError("not-running", "Aktar isn't running, or its local API is turned off."));
      } else if (error.code === "EPIPE" || error.code === "ECONNRESET") {
        // Aktar closes the connection early when it rejects a request, or when it quits mid-upload.
        reject(new AktarError("request-failed", "Aktar closed the connection before the request finished."));
      } else {
        reject(new AktarError("request-failed", error.message));
      }
    });

    if (options.file) {
      const { onProgress } = options.file;
      const stream = createReadStream(options.file.path);
      let sent = 0;
      stream.on("data", (chunk) => {
        sent += chunk.length;
        onProgress?.(fileSize > 0 ? sent / fileSize : 1);
      });
      stream.on("error", (error) => req.destroy(error));
      stream.pipe(req);
    } else {
      req.end(body);
    }
  });
}

// MARK: - Endpoints

export function getStatus(connection?: Connection) {
  return request<Status>("GET", "status", { connection });
}

export async function listDestinations() {
  return (await request<{ destinations: Destination[] }>("GET", "destinations")).destinations;
}

export async function listUploads(options: { query?: string; destinationId?: string; limit?: number } = {}) {
  return (await request<{ uploads: Upload[] }>("GET", "uploads", { query: options })).uploads;
}

export async function deleteUpload(id: string) {
  await request("DELETE", `uploads/${encodeURIComponent(id)}`);
}

/**
 * Uploads one file. Without a `prefix`, Aktar names it with the
 * destination's path template, same as a file dropped on Aktar. With one,
 * the file keeps its name inside that folder (numbered if it's taken).
 * `expires` (days) asks Aktar to auto-delete the file; it can't be combined
 * with a `prefix`, and 0 or undefined keeps it forever.
 * `filename` renames the upload (it's what replaces {filename} and {ext} in
 * the path template, and what history shows); it defaults to the file's name.
 */
export async function uploadFile(
  filePath: string,
  options: {
    destinationId?: string;
    prefix?: string;
    expires?: number;
    filename?: string;
    onProgress?: (fraction: number) => void;
  } = {},
) {
  const response = await request<UploadReply>("POST", "uploads", {
    query: {
      filename: options.filename || path.basename(filePath),
      destinationId: options.destinationId,
      prefix: options.prefix,
      // Left out when keeping forever, so Aktar versions without auto-delete keep working.
      expires: options.expires || undefined,
    },
    file: { path: filePath, onProgress: options.onProgress },
  });
  return unwrapUpload(response);
}

/**
 * Writes `filePath` over an upload in Aktar's history: the key and link stay,
 * the file is new. Needs Aktar for Mac 0.14.0 or Aktar for Windows 0.7.0;
 * older versions answer 404, see `isReplaceUnsupported`.
 */
export async function replaceUpload(id: string, filePath: string, onProgress?: (fraction: number) => void) {
  const response = await request<UploadReply>("POST", `uploads/${encodeURIComponent(id)}/replace`, {
    query: { filename: path.basename(filePath) },
    file: { path: filePath, onProgress },
  });
  return unwrapUpload(response);
}

/** Writes `filePath` over the object at `key` in a destination's bucket, keeping its link. */
export async function replaceObject(
  destinationId: string,
  key: string,
  filePath: string,
  onProgress?: (fraction: number) => void,
) {
  const response = await request<UploadReply>("PUT", bucketRoute(destinationId, "objects"), {
    query: { key, filename: path.basename(filePath) },
    file: { path: filePath, onProgress },
  });
  return unwrapUpload(response);
}

/** True when this Aktar predates replacing files: it answers the unknown route with 404 "Not found.". */
export function isReplaceUnsupported(error: unknown) {
  return (
    error instanceof AktarError &&
    error.kind === "request-failed" &&
    error.status === 404 &&
    error.message === "Not found."
  );
}

export async function uploadClipboard(options: { destinationId?: string; expires?: number } = {}) {
  const response = await request<UploadReply>("POST", "uploads/clipboard", {
    query: { destinationId: options.destinationId, expires: options.expires || undefined },
  });
  return unwrapUpload(response);
}

/** Aktar for Mac puts `reused` in the upload, Aktar for Windows next to it. */
type UploadReply = { upload: Upload; reused?: boolean };

function unwrapUpload(reply: UploadReply): Upload {
  return { ...reply.upload, reused: reply.upload.reused === true || reply.reused === true };
}

function bucketRoute(destinationId: string, rest: string) {
  return `destinations/${encodeURIComponent(destinationId)}/${rest}`;
}

export function listObjects(destinationId: string, prefix: string, continuationToken?: string | null) {
  return request<BucketListing>("GET", bucketRoute(destinationId, "objects"), {
    query: { prefix, continuationToken },
  });
}

export async function deleteObject(destinationId: string, key: string) {
  await request("DELETE", bucketRoute(destinationId, "objects"), { query: { key } });
}

export async function moveObject(destinationId: string, from: string, to: string) {
  await request("POST", bucketRoute(destinationId, "objects/move"), { json: { from, to } });
}

export async function createFolder(destinationId: string, prefix: string, name: string) {
  await request("POST", bucketRoute(destinationId, "folders"), { json: { prefix, name } });
}

export function createTemporaryLink(destinationId: string, key: string, expiresInSeconds: number) {
  return request<TemporaryLink>("POST", bucketRoute(destinationId, "links"), {
    json: { key, expiresIn: expiresInSeconds },
  });
}

// MARK: - Thumbnails

/**
 * A PNG thumbnail, its longest side at most `px` pixels, or null when there's
 * none (thumbnails are off for the destination, or none could be made).
 * With `generate` false, Aktar only returns one it already has, never
 * downloading the file to make one. Aktar versions before thumbnails answer
 * 404; see `isThumbnailsUnsupported`.
 */
export function getUploadThumbnail(id: string, options: { px: number; generate: boolean }) {
  return request<Buffer | null>("GET", `uploads/${encodeURIComponent(id)}/thumbnail`, {
    query: { px: options.px, generate: options.generate ? undefined : 0 },
    binary: true,
  });
}

export function getObjectThumbnail(
  destinationId: string,
  object: { key: string; size: number; lastModified: string | null },
  options: { px: number; generate: boolean },
) {
  return request<Buffer | null>("GET", bucketRoute(destinationId, "thumbnail"), {
    query: {
      key: object.key,
      objectSize: object.size,
      lastModified: object.lastModified,
      px: options.px,
      generate: options.generate ? undefined : 0,
    },
    binary: true,
  });
}

/**
 * True when this Aktar predates thumbnails and doesn't know the route. Aktar
 * answers an unknown route with "Not found."; a 404 about a missing upload,
 * object or destination says so and doesn't count.
 */
export function isThumbnailsUnsupported(error: unknown) {
  return (
    error instanceof AktarError &&
    error.kind === "request-failed" &&
    error.status === 404 &&
    error.message === "Not found."
  );
}

// MARK: - Watched folders

/** True when this Aktar predates watched folders and doesn't know the route. */
export function isWatchedFoldersUnsupported(error: unknown) {
  return error instanceof AktarError && error.kind === "request-failed" && error.status === 404;
}

export function listWatchedFolders() {
  return request<WatchedFolders>("GET", "watched-folders");
}

/** Pauses every watched folder for `minutes`, or until resumed when it's left out. */
export function pauseWatching(minutes?: number) {
  return request<WatchedFolders>("POST", "watched-folders/pause", { json: { minutes: minutes ?? null } });
}

export function resumeWatching() {
  return request<WatchedFolders>("POST", "watched-folders/resume");
}

export function setWatchedFolderEnabled(id: string, enabled: boolean) {
  return request<WatchedFolder>("POST", `watched-folders/${encodeURIComponent(id)}`, { json: { enabled } });
}
