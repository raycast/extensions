import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Client for the deed.page publish API (https://deed.page/docs).
 *
 * Publishing needs no account. The first publish without a token returns an
 * owner token once; later requests send it as a Bearer token to update, list,
 * and delete that owner's sites. Every publish uses the manifest upload
 * (plan, upload missing blobs, finalize), so a site is limited by the plan,
 * not by one request body.
 */

export const API_URL = "https://deed.page";
const CLIENT = "raycast";
const REF = "raycast";
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_FILES = 5000;
const MAX_BYTES = 100 * 1024 * 1024;
const SKIPPED_NAMES = new Set([".DS_Store", ".git", "node_modules", "Thumbs.db", ".svn", ".hg"]);
const HTML_EXTENSIONS = new Set([".html", ".htm"]);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

export interface SiteFile {
  path: string;
  size: number;
  sha256: string;
  contentType: string;
  data: Buffer;
}

export interface PublishResult {
  url: string;
  slug: string;
  version: string;
  /** Only returned by a first publish without a token. */
  token?: string;
}

export interface Site {
  slug: string;
  url: string;
  version: string;
  bytes: number;
  files: number;
  created_at?: string;
  updated_at?: string;
  expires_at?: string | null;
  protected?: boolean;
}

export class DeedPageError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "DeedPageError";
    this.status = status;
    this.code = code;
  }
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** A readable slug that is unlikely to be taken, for example `trip-notes-k3j9x2`. */
export function suggestSlug(name: string, random = Math.random().toString(36).slice(2, 8)): string {
  const base =
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "site";
  const suffix = random.toLowerCase().replace(/[^a-z0-9]/g, "") || "0";
  return `${base}-${suffix}`.slice(0, 63).replace(/-+$/, "");
}

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export function makeFile(sitePath: string, data: Buffer): SiteFile {
  return {
    path: sitePath,
    size: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
    contentType: contentTypeFor(sitePath),
    data,
  };
}

/**
 * The files to publish for a file or folder on disk, with site-relative POSIX paths.
 * A single HTML file becomes `index.html` so it is served at the site root.
 * Hidden names (anything starting with a dot), `node_modules`, and symlinks are skipped.
 * The walk checks each file size with `fs.stat` and stops if the total exceeds 100 MB.
 */
export async function collectFiles(inputPath: string): Promise<SiteFile[]> {
  const info = await fs.stat(inputPath);
  if (info.isFile()) {
    if (info.size > MAX_BYTES) {
      throw new Error(`The selection is larger than ${formatBytes(MAX_BYTES)}.`);
    }
    const name = path.basename(inputPath);
    const sitePath = HTML_EXTENSIONS.has(path.extname(name).toLowerCase()) ? "index.html" : name;
    return [makeFile(sitePath, await fs.readFile(inputPath))];
  }
  if (!info.isDirectory()) {
    throw new Error("Choose a file or a folder.");
  }

  const files: SiteFile[] = [];
  let total = 0;
  async function walk(rel: string) {
    const entries = await fs.readdir(path.join(inputPath, rel), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (SKIPPED_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(next);
      } else if (entry.isFile()) {
        if (files.length >= MAX_FILES) {
          throw new Error(`The folder has more than ${MAX_FILES} files.`);
        }
        const full = path.join(inputPath, next);
        total += (await fs.stat(full)).size;
        if (total > MAX_BYTES) {
          throw new Error(`The selection is larger than ${formatBytes(MAX_BYTES)}.`);
        }
        files.push(makeFile(next, await fs.readFile(full)));
      }
    }
  }
  await walk("");
  return files;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Not JSON, for example a platform error page.
  }
  if (!response.ok || !body || body.ok === false) {
    const code = body && typeof body.error === "string" ? body.error : undefined;
    const message =
      (body &&
        ((typeof body.message_for_user === "string" && body.message_for_user) ||
          (typeof body.message === "string" && body.message) ||
          code)) ||
      `deed.page returned HTTP ${response.status}`;
    throw new DeedPageError(message, response.status, code);
  }
  return body as T;
}

function headers(token?: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Accept: "application/json",
    "X-Client": CLIENT,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

interface UploadPlan {
  missing?: Array<{
    sha256: string;
    stored?: boolean;
    upload?: { url: string; method?: string; headers?: Record<string, string> };
  }>;
  finalize_url?: string;
}

/** Publish files as a new version of `https://<slug>.deed.page/`, creating the site if it does not exist. */
export async function publishFiles({
  files,
  slug,
  token,
  fetchImpl = fetch,
}: {
  files: SiteFile[];
  slug: string;
  token?: string;
  fetchImpl?: typeof fetch;
}): Promise<PublishResult> {
  if (!isValidSlug(slug)) {
    throw new Error("Use 1–63 lowercase letters, digits, or hyphens, not starting or ending with a hyphen.");
  }
  if (files.length === 0) {
    throw new Error("There is nothing to publish.");
  }

  const plan = await readJson<UploadPlan>(
    await fetchImpl(`${API_URL}/v1/uploads?ref=${REF}`, {
      method: "POST",
      headers: headers(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        slug,
        files: files.map((f) => ({ path: f.path, sha256: f.sha256, size: f.size, content_type: f.contentType })),
      }),
    }),
  );

  const bySha = new Map(files.map((f) => [f.sha256, f]));
  for (const blob of plan.missing ?? []) {
    if (blob.stored) continue;
    const file = bySha.get(blob.sha256);
    if (!file || !blob.upload?.url) {
      throw new Error("deed.page asked for a file that is not part of this upload.");
    }
    const response = await fetchImpl(blob.upload.url, {
      method: blob.upload.method ?? "PUT",
      headers: blob.upload.headers ?? {},
      body: new Uint8Array(file.data),
    });
    if (!response.ok) {
      throw new DeedPageError(`Uploading ${file.path} failed with HTTP ${response.status}.`, response.status);
    }
  }

  if (!plan.finalize_url) {
    throw new Error("deed.page did not return a finalize URL.");
  }
  const result = await readJson<{ url?: string; slug?: string; version?: string; token?: string }>(
    await fetchImpl(plan.finalize_url, { method: "POST", headers: headers(token) }),
  );
  if (!result.url) {
    throw new Error("deed.page did not return a URL.");
  }
  return {
    url: result.url,
    slug: result.slug ?? slug,
    version: result.version ?? "",
    token: result.token || undefined,
  };
}

/** Publish an HTML document as the `index.html` of a site. */
export function publishHtml(options: {
  html: string;
  slug: string;
  token?: string;
  fetchImpl?: typeof fetch;
}): Promise<PublishResult> {
  const { html, ...rest } = options;
  return publishFiles({ ...rest, files: [makeFile("index.html", Buffer.from(html, "utf8"))] });
}

/** Every site owned by the token, newest update first. */
export async function listSites(token: string, fetchImpl: typeof fetch = fetch): Promise<Site[]> {
  const body = await readJson<{ sites?: Site[] }>(await fetchImpl(`${API_URL}/v1/sites`, { headers: headers(token) }));
  return [...(body.sites ?? [])].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}

/** Delete a site the token owns. The URL stops serving right away. */
export async function deleteSite(slug: string, token: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  await readJson<unknown>(
    await fetchImpl(`${API_URL}/v1/sites/${encodeURIComponent(slug)}`, { method: "DELETE", headers: headers(token) }),
  );
}

/** True when the text contains a real HTML document or fragment marker. */
export function looksLikeHtml(text: string): boolean {
  return /<(?:!doctype\s+html|html|head|body|div|p|h[1-6]|section|script)(?:\s|\/|>)/i.test(text.trim());
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
