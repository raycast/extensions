import { basename, extname } from "node:path";
import { readFile, stat } from "node:fs/promises";

const API_BASE_URL = "https://api.uploadkit.dev/api/v1";
const DEFAULT_ROUTE_SLUG = "default";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

interface UploadRequestResponse {
  fileId: string;
  uploadUrl: string;
}

interface UploadCompleteResponse {
  file: {
    id: string;
    key: string;
    name: string;
    size: number;
    type: string;
    url: string;
    status: "UPLOADED";
  };
}

interface ApiErrorDetails {
  code: string | undefined;
  message: string | undefined;
  suggestion: string | undefined;
}

export interface UploadedImage {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export class UploadKitApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly suggestion?: string;

  constructor(message: string, status: number, code?: string, suggestion?: string) {
    super(message);
    this.name = "UploadKitApiError";
    this.status = status;
    this.code = code;
    this.suggestion = suggestion;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = getApiError(payload);
    throw new UploadKitApiError(
      error?.message ?? `UploadKit returned HTTP ${response.status}`,
      response.status,
      error?.code,
      error?.suggestion,
    );
  }

  if (!payload) {
    throw new UploadKitApiError("UploadKit returned an empty response", response.status);
  }

  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiError(payload: unknown): ApiErrorDetails | undefined {
  if (!isRecord(payload) || !isRecord(payload.error)) return undefined;

  return {
    code: typeof payload.error.code === "string" ? payload.error.code : undefined,
    message: typeof payload.error.message === "string" ? payload.error.message : undefined,
    suggestion: typeof payload.error.suggestion === "string" ? payload.error.suggestion : undefined,
  };
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isUploadRequestResponse(value: unknown): value is UploadRequestResponse {
  return isRecord(value) && typeof value.fileId === "string" && value.fileId.length > 0 && isHttpUrl(value.uploadUrl);
}

function isUploadCompleteResponse(value: unknown): value is UploadCompleteResponse {
  if (!isRecord(value) || !isRecord(value.file)) return false;

  const { file } = value;
  return (
    typeof file.id === "string" &&
    typeof file.key === "string" &&
    typeof file.name === "string" &&
    typeof file.size === "number" &&
    Number.isFinite(file.size) &&
    typeof file.type === "string" &&
    file.status === "UPLOADED" &&
    isHttpUrl(file.url)
  );
}

function authorizationHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };
}

export function getImageContentType(filePath: string): string | undefined {
  return IMAGE_CONTENT_TYPES[extname(filePath).toLowerCase()];
}

export async function uploadImage(filePath: string, apiKey: string): Promise<UploadedImage> {
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    throw new Error("Choose an image file, not a folder.");
  }

  const contentType = getImageContentType(filePath);
  if (!contentType) {
    throw new Error("Unsupported image format. Use PNG, JPEG, GIF, WebP, AVIF, SVG, HEIC, BMP, or TIFF.");
  }

  const fileName = basename(filePath);
  const requestResponse = await fetch(`${API_BASE_URL}/upload/request`, {
    method: "POST",
    headers: authorizationHeaders(apiKey),
    body: JSON.stringify({
      fileName,
      fileSize: fileStats.size,
      contentType,
      routeSlug: DEFAULT_ROUTE_SLUG,
      metadata: { source: "raycast" },
    }),
  });
  const uploadRequestPayload = await parseResponse<unknown>(requestResponse);
  if (!isUploadRequestResponse(uploadRequestPayload)) {
    throw new UploadKitApiError("UploadKit returned an invalid upload request", requestResponse.status);
  }
  const uploadRequest = uploadRequestPayload;

  const fileContents = await readFile(filePath);
  const storageResponse = await fetch(uploadRequest.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStats.size),
    },
    body: fileContents,
  });

  if (!storageResponse.ok) {
    throw new Error(`Storage upload failed with HTTP ${storageResponse.status}. Please try again.`);
  }

  const completeResponse = await fetch(`${API_BASE_URL}/upload/complete`, {
    method: "POST",
    headers: authorizationHeaders(apiKey),
    body: JSON.stringify({ fileId: uploadRequest.fileId }),
  });
  const completePayload = await parseResponse<unknown>(completeResponse);
  if (!isUploadCompleteResponse(completePayload)) {
    throw new UploadKitApiError("UploadKit did not confirm a valid uploaded image", completeResponse.status);
  }
  const completed = completePayload;

  return completed.file;
}
