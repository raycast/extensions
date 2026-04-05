import fs from "fs";
import path from "path";
import { showToast, Toast } from "@raycast/api";
import { getApiKey, getBaseUrl } from "./preferences";
import type {
  PaginatedResponse,
  Post,
  Account,
  MediaItem,
  AnalyticsOverview,
  PostAnalytics,
  CreatePostRequest,
  ApiError,
} from "./types";

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/v1${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const error = (await response.json()) as ApiError;
      errorMessage = error.error?.message || errorMessage;
    } catch {
      // Use default error message
    }

    if (response.status === 401) {
      throw new Error(
        "Invalid API key. Check your OmniSocials API key in extension preferences.",
      );
    }
    if (response.status === 403) {
      throw new Error(
        "Insufficient permissions. Your API key may not have the required scopes.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Posts
export async function listPosts(
  status?: string,
  limit = 50,
  offset = 0,
): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return request<PaginatedResponse<Post>>(`/posts?${params}`);
}

export async function getPost(id: string): Promise<{ data: Post }> {
  return request<{ data: Post }>(`/posts/${id}`);
}

export async function createPost(
  data: CreatePostRequest,
): Promise<{ data: Post }> {
  return request<{ data: Post }>("/posts/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createAndPublishPost(
  data: CreatePostRequest,
): Promise<{ data: Post }> {
  return request<{ data: Post }>("/posts/create-and-publish", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePost(
  id: string,
  data: Partial<CreatePostRequest>,
): Promise<{ data: Post }> {
  return request<{ data: Post }>(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: string): Promise<void> {
  return request<void>(`/posts/${id}`, { method: "DELETE" });
}

export async function publishPost(id: string): Promise<{ data: Post }> {
  return request<{ data: Post }>(`/posts/${id}/publish`, { method: "POST" });
}

// Accounts
export async function listAccounts(
  platform?: string,
): Promise<{ data: Account[] }> {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  return request<{ data: Account[] }>(`/accounts?${params}`);
}

export async function getAccount(id: string): Promise<{ data: Account }> {
  return request<{ data: Account }>(`/accounts/${id}`);
}

// Media
export async function listMedia(
  limit = 50,
  offset = 0,
): Promise<PaginatedResponse<MediaItem>> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return request<PaginatedResponse<MediaItem>>(`/media?${params}`);
}

export async function uploadMediaFile(
  filePath: string,
): Promise<{ data: MediaItem }> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
  };
  const mimeType = mimeMap[ext] || "application/octet-stream";

  const blob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append("file", blob, fileName);

  const response = await fetch(`${baseUrl}/api/v1/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Upload failed (${response.status})`;
    try {
      const error = (await response.json()) as ApiError;
      errorMessage = error.error?.message || errorMessage;
    } catch {
      // Use default
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<{ data: MediaItem }>;
}

export async function deleteMedia(id: string): Promise<void> {
  return request<void>(`/media/${id}`, { method: "DELETE" });
}

// Analytics
export async function getAnalyticsOverview(
  period: "7d" | "30d" | "90d" = "30d",
): Promise<{ data: AnalyticsOverview; period: string }> {
  return request<{ data: AnalyticsOverview; period: string }>(
    `/analytics/overview?period=${period}`,
  );
}

export async function getPostAnalytics(
  postId: string,
): Promise<{ data: PostAnalytics }> {
  return request<{ data: PostAnalytics }>(`/analytics/posts/${postId}`);
}

export async function getAccountAnalytics(
  platform?: string,
  date?: string,
): Promise<{ data: unknown[]; date: string }> {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (date) params.set("date", date);
  return request<{ data: unknown[]; date: string }>(
    `/analytics/accounts?${params}`,
  );
}

// Helper to show API errors as toasts
export async function withErrorToast<T>(
  fn: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
    return undefined;
  }
}
