import { getPreferenceValues } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ItemStatus = "pending" | "processing" | "done" | "error";
export type ItemType = "link" | "image" | "pdf" | "video" | "audio" | "text";

export interface SummaryPoint {
  emoji: string;
  text: string;
}

export interface SuggestedQuestion {
  question: string;
  answer: string;
}

export interface SummyItem {
  id: string;
  type: ItemType;
  sourceUrl: string | null;
  imageUrl: string | null;
  title: string | null;
  rawText: string | null;
  status: ItemStatus;
  error: string | null;
  summaryPoints: SummaryPoint[] | null;
  summaryParagraph: string | null;
  qa: SuggestedQuestion[] | null;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = "https://summy-api.pat-barlow.workers.dev";
const IMAGE_MEDIA_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const TEXT_EXTENSIONS = new Set([".csv", ".json", ".md", ".markdown", ".txt"]);

export class SummyAPIError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function configuration(): Preferences {
  return getPreferenceValues<Preferences>();
}

async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const { sessionToken } = configuration();
  const url = new URL(endpoint.replace(/^\//, ""), `${API_BASE_URL}/`);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    let code = "request_failed";
    try {
      const body = (await response.json()) as { error?: string };
      code = body.error ?? code;
    } catch {
      // Keep remote response bodies out of errors and logs.
    }
    throw new SummyAPIError(code, response.status);
  }

  return (await response.json()) as T;
}

export async function listItems(): Promise<SummyItem[]> {
  const response = await request<{ items: SummyItem[] }>("items");
  return response.items;
}

export async function createLink(url: string): Promise<SummyItem> {
  return request<SummyItem>("items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "link", url }),
  });
}

export async function createText(text: string, title?: string): Promise<SummyItem> {
  return request<SummyItem>("items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "text", text, title }),
  });
}

export async function uploadFile(filePath: string, type: "image" | "pdf", mediaType: string): Promise<SummyItem> {
  const bytes = await readFile(filePath);
  const query = new URLSearchParams({ type, mediaType });
  return request<SummyItem>(`items/upload?${query.toString()}`, {
    method: "POST",
    headers: { "Content-Type": mediaType },
    body: bytes,
  });
}

export async function saveFile(filePath: string): Promise<SummyItem> {
  const extension = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);

  if (extension === ".pdf") return uploadFile(filePath, "pdf", "application/pdf");

  if (IMAGE_MEDIA_TYPES[extension]) return uploadFile(filePath, "image", IMAGE_MEDIA_TYPES[extension]);

  if (TEXT_EXTENSIONS.has(extension)) {
    const text = await readFile(filePath, "utf8");
    return createText(text, name);
  }

  throw new Error(`Summy cannot import ${extension || "this file type"} yet.`);
}

export function canSaveFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".pdf" || extension in IMAGE_MEDIA_TYPES || TEXT_EXTENSIONS.has(extension);
}

export async function getItem(id: string): Promise<SummyItem> {
  return request<SummyItem>(`items/${id}`);
}

export async function regenerateItem(id: string): Promise<void> {
  await request<{ ok: true }>(`items/${id}/regenerate`, { method: "POST" });
}

export async function deleteItem(id: string): Promise<void> {
  await request<{ ok: true }>(`items/${id}`, { method: "DELETE" });
}

export function friendlyError(error: unknown): string {
  if (error instanceof SummyAPIError) {
    if (error.status === 401) return "The Summy session token needs updating.";
    if (error.status === 413) return "That file is too large to upload.";
    return "Summy could not complete the request.";
  }
  if (error instanceof Error && error.message.startsWith("Summy cannot import")) return error.message;
  return "Summy could not be reached.";
}
