import { readFileSync } from "fs";
import { basename } from "path";
import { CdnApiError } from "./types";
import type { UploadRecord } from "./types";
import { getImageDimensions } from "./imageDimensions";
import type { ImageDimensions } from "./imageDimensions";
export type { ImageDimensions } from "./imageDimensions";

const BASE_URL = "https://cdn.hackclub.com";

interface UploadResponseBody {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  url: string;
  created_at: string;
}

interface ErrorResponseBody {
  error?: string;
  quota?: {
    storage_used: number;
    storage_limit: number;
    quota_tier: string;
    percentage_used: number;
  };
}

function toUploadRecord(
  body: UploadResponseBody,
  sourceType: "file" | "url",
  dimensions?: ImageDimensions,
): UploadRecord {
  return {
    id: body.id,
    filename: body.filename,
    url: body.url,
    size: body.size,
    contentType: body.content_type,
    createdAt: body.created_at,
    sourceType,
    width: dimensions?.width,
    height: dimensions?.height,
  };
}

export async function fetchImageDimensions(url: string): Promise<ImageDimensions | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return getImageDimensions(buffer);
  } catch {
    return undefined;
  }
}

async function raiseForError(response: Response): Promise<never> {
  let body: ErrorResponseBody | undefined;
  try {
    body = (await response.json()) as ErrorResponseBody;
  } catch {
    body = undefined;
  }

  if (response.status === 401) {
    throw new CdnApiError("Invalid or missing API token. Open extension preferences to set it.", 401);
  }

  if (response.status === 402 && body?.quota) {
    const { storage_used, storage_limit, quota_tier } = body.quota;
    const usedMb = Math.round(storage_used / 1024 / 1024);
    const limitMb = Math.round(storage_limit / 1024 / 1024);
    throw new CdnApiError(`Storage quota exceeded (${usedMb}MB / ${limitMb}MB used, ${quota_tier} tier).`, 402);
  }

  throw new CdnApiError(body?.error ?? `Request failed with status ${response.status}`, response.status);
}

function escapeMultipartFilename(filename: string): string {
  return filename
    .replace(/[\r\n]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function toAsciiSafeFallback(filename: string): string {
  // Non-ASCII characters aren't valid in the basic (non-extended) filename parameter; replace
  // them with an underscore so the fallback parameter is always ASCII-safe. The real name is
  // carried correctly by the filename* extended parameter added alongside it.
  return filename.replace(/[^\x20-\x7E]/g, "_");
}

function encodeRfc5987Filename(filename: string): string {
  return encodeURIComponent(filename)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");
}

function buildMultipartBody(fieldName: string, filename: string, fileBuffer: Buffer, boundary: string): Buffer {
  const asciiFallback = escapeMultipartFilename(toAsciiSafeFallback(filename));
  const extendedFilename = encodeRfc5987Filename(filename);
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${asciiFallback}"; filename*=UTF-8''${extendedFilename}\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([header, fileBuffer, footer]);
}

function generateBoundary(): string {
  return `----hackclubcdn${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

export async function uploadFile(filePath: string, token: string): Promise<UploadRecord> {
  const fileBuffer = readFileSync(filePath);
  const dimensions = getImageDimensions(fileBuffer);
  const boundary = generateBoundary();
  const body = buildMultipartBody("file", basename(filePath), fileBuffer, boundary);

  const response = await fetch(`${BASE_URL}/api/v4/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    await raiseForError(response);
  }

  const uploadBody = (await response.json()) as UploadResponseBody;
  return toUploadRecord(uploadBody, "file", dimensions);
}

export async function uploadFromUrl(url: string, token: string): Promise<UploadRecord> {
  const response = await fetch(`${BASE_URL}/api/v4/upload_from_url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    await raiseForError(response);
  }

  const body = (await response.json()) as UploadResponseBody;
  return toUploadRecord(body, "url");
}

export async function deleteUpload(id: string, token: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/v4/upload/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    await raiseForError(response);
  }
}
