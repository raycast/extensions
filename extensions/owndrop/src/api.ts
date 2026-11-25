import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { environment, getPreferenceValues } from "@raycast/api";

export interface LinkPreview {
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export interface DropItem {
  id: string;
  type: "text" | "image" | "file";
  text?: string;
  name?: string;
  mime?: string;
  size: number;
  device: string;
  pinned: boolean;
  previewStatus?: "pending" | "ready" | "failed";
  linkPreview?: LinkPreview;
  createdAt: string;
}

export interface MeInfo {
  device: string | null;
  version: string;
  maxFileMb: number;
  maxPresignedFileMb: number;
  directUploadEnabled: boolean;
}

function getConfig(): { baseUrl: string; token: string } {
  const prefs = getPreferenceValues<Preferences>();
  let serverUrl = prefs.serverUrl?.trim() ?? "";
  let token = prefs.apiToken.trim();
  if (token.startsWith("owndrop-setup:")) {
    const setup = /^owndrop-setup:v1 (\S+) (owd_[A-Za-z0-9_-]{43})$/.exec(token);
    if (!setup) throw new Error("Invalid OwnDrop connection details. Copy it again from OwnDrop Devices.");
    [, serverUrl, token] = setup;
  }
  const url = URL.canParse(serverUrl) ? new URL(serverUrl) : undefined;
  if (
    !url ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
  ) {
    throw new Error("Enter a valid HTTPS Server URL in extension preferences (HTTP is allowed for local dev).");
  }
  if (!token) {
    throw new Error("Paste connection details or a Device API Token in extension preferences.");
  }
  const baseUrl = url.href.replace(/\/+$/, "");
  return { baseUrl, token };
}

export function getServerUrl(): string {
  return getConfig().baseUrl;
}

export function getCacheScope(): string {
  const { baseUrl, token } = getConfig();
  return createHash("sha256")
    .update(JSON.stringify([baseUrl, token]))
    .digest("hex");
}

async function apiFetch<T>(apiPath: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, token } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("User-Agent", "OwnDrop-Raycast/1.0");

  const res = await fetch(`${baseUrl}${apiPath}`, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `OwnDrop returned HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getMe(): Promise<MeInfo> {
  return apiFetch<MeInfo>("/api/me");
}

export async function listDrops(query = "", limit = 50, signal?: AbortSignal): Promise<DropItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  return apiFetch<DropItem[]>(`/api/items?${params.toString()}`, { headers: { "Cache-Control": "no-cache" }, signal });
}

export async function getLatestDrop(): Promise<DropItem> {
  return apiFetch<DropItem>("/api/items/latest");
}

export function containsSetupCredential(text: string): boolean {
  return text.includes("owndrop-setup:") || /\bowd_[A-Za-z0-9_-]{43}\b/.test(text);
}

export async function dropText(text: string): Promise<DropItem> {
  if (containsSetupCredential(text)) {
    throw new Error("OwnDrop setup credentials cannot be dropped. Paste them into extension preferences.");
  }
  return apiFetch<DropItem>("/api/items/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

function guessMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".zip": "application/zip",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
  };
  return map[ext] ?? "application/octet-stream";
}

export function normalizeLocalPath(rawPath: string): string {
  if (rawPath.startsWith("file://")) {
    try {
      return fileURLToPath(rawPath);
    } catch {
      return decodeURIComponent(rawPath.replace(/^file:\/\//, ""));
    }
  }
  return rawPath;
}

export async function dropFileFromPath(rawPath: string): Promise<DropItem> {
  const localPath = normalizeLocalPath(rawPath);
  const stat = await fs.stat(localPath);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${path.basename(localPath)}`);
  }

  const name = path.basename(localPath);
  const mime = guessMime(name);
  const bytes = await fs.readFile(localPath);
  const me = await getMe().catch(() => null);
  const directLimit = (me?.maxFileMb ?? 90) * 1024 * 1024;

  if (me?.directUploadEnabled && bytes.byteLength > directLimit) {
    const presigned = await apiFetch<{
      uploadId: string;
      url: string;
      method: "PUT";
      headers: Record<string, string>;
    }>("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mime, size: bytes.byteLength }),
    });

    const putRes = await fetch(presigned.url, {
      method: presigned.method,
      headers: presigned.headers,
      body: bytes,
    });
    if (!putRes.ok) {
      throw new Error(`Direct upload failed (${putRes.status})`);
    }
    return apiFetch<DropItem>("/api/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: presigned.uploadId }),
    });
  }

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), name);
  return apiFetch<DropItem>("/api/items/file", {
    method: "POST",
    body: form,
  });
}

export async function setDropPinned(id: string, pinned: boolean): Promise<void> {
  await apiFetch<void>(`/api/items/${encodeURIComponent(id)}/pin`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
}

export async function deleteDrop(id: string): Promise<void> {
  await apiFetch<void>(`/api/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function downloadDropToDownloads(item: DropItem): Promise<string> {
  return downloadDrop(item, false);
}

export async function downloadDropForClipboard(item: DropItem): Promise<string> {
  return downloadDrop(item, true);
}

export async function getImagePreview(item: DropItem, signal?: AbortSignal): Promise<string> {
  const { baseUrl, token } = getConfig();
  const key = createHash("sha256")
    .update(JSON.stringify([getCacheScope(), item.id]))
    .digest("hex");
  const filenameExtension = path.extname(item.name ?? "").toLowerCase();
  const extension =
    {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "image/avif": ".avif",
      "image/bmp": ".bmp",
    }[item.mime ?? ""] ??
    ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".bmp"].includes(filenameExtension)
      ? filenameExtension
      : ".img");
  const directory = path.join(environment.supportPath, "image-previews");
  const target = path.join(directory, `${key}${extension}`);
  try {
    await fs.access(target);
    return target;
  } catch {
    // Download only the selected image, and reuse it on subsequent selections.
  }
  if (item.size > 20 * 1024 * 1024)
    throw new Error("Preview supports images up to 20 MB. You can still copy or download this image.");
  const response = await fetch(`${baseUrl}/api/files/${encodeURIComponent(item.id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Could not load image (HTTP ${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  signal?.throwIfAborted();
  await fs.mkdir(directory, { recursive: true });
  const tempTarget = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempTarget, bytes);
    await fs.rename(tempTarget, target);
  } catch (err) {
    await fs.unlink(tempTarget).catch(() => {});
    throw err;
  }
  return target;
}

async function downloadDrop(item: DropItem, clipboardOnly: boolean): Promise<string> {
  const { baseUrl, token } = getConfig();
  const res = await fetch(`${baseUrl}/api/files/${encodeURIComponent(item.id)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "OwnDrop-Raycast/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to download file (HTTP ${res.status})`);
  }

  // File clipboard entries reference a local path. Keep it available for later paste.
  const downloadsDir = clipboardOnly
    ? await fs.mkdtemp(path.join(os.tmpdir(), "owndrop-clipboard-"))
    : path.join(os.homedir(), "Downloads");
  await fs.mkdir(downloadsDir, { recursive: true });

  const safeName = (item.name || `owndrop-${item.id}`).replace(/[/\\:*?"<>|]/g, "_");
  const parsed = path.parse(safeName);
  const buffer = Buffer.from(await res.arrayBuffer());

  for (let i = 0; i < 100; i++) {
    const candidate =
      i === 0 ? path.join(downloadsDir, safeName) : path.join(downloadsDir, `${parsed.name}-${i}${parsed.ext}`);
    try {
      await fs.writeFile(candidate, buffer, { flag: "wx" });
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  throw new Error(`Could not save ${safeName}: too many files with the same name in Downloads.`);
}

export function extractUrl(text?: string): string | null {
  const trimmed = text?.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
