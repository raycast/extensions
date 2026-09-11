import { getPreferenceValues } from "@raycast/api";
import type {
  ListVideosParams,
  ListVideosResponse,
  GetVideoResponse,
  UpdateVideoRequest,
  DuplicateVideoRequest,
  StartExportRequest,
  StartExportResponse,
  ListPlaylistsParams,
  ListPlaylistsResponse,
  GetPlaylistResponse,
  CreatePlaylistRequest,
  CreatePlaylistResponse,
  UpdatePlaylistRequest,
  AddVideoToPlaylistRequest,
} from "./types";

const API = "https://api.tella.com/v1";
const MAX_RETRY_ATTEMPTS = 3;

export class RateLimitError extends Error {
  retryAfter?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("Tella API key is required. Please set it in extension preferences.");
    this.name = "MissingApiKeyError";
  }
}

function getAuthHeaders() {
  const { tellaApiKey } = getPreferenceValues<{ tellaApiKey: string }>();
  if (!tellaApiKey) {
    throw new MissingApiKeyError();
  }
  return {
    Authorization: `Bearer ${tellaApiKey}`,
    "Content-Type": "application/json",
  };
}

async function tellaFetch<T>(
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
  });

  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;

    // If we have retries left, wait and retry
    if (attempt < MAX_RETRY_ATTEMPTS) {
      // Use Retry-After header if available, otherwise exponential backoff with jitter
      const waitMs = retryAfter
        ? retryAfter * 1000
        : 500 * Math.pow(2, attempt) + Math.random() * 1000;

      await new Promise((r) => setTimeout(r, waitMs));
      return tellaFetch<T>(path, init, attempt + 1);
    }

    // Exhausted retries - throw a specific rate limit error
    const body = await res.text();
    let errorMessage =
      "Rate limit exceeded. Please wait a moment and try again.";

    try {
      const errorData = JSON.parse(body);
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Use default message if body isn't valid JSON
    }

    throw new RateLimitError(
      retryAfter
        ? `${errorMessage} Retry after ${retryAfter} second${retryAfter > 1 ? "s" : ""}.`
        : errorMessage,
      retryAfter,
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// Video Functions

export async function listVideos(
  params?: ListVideosParams,
): Promise<ListVideosResponse> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) {
    searchParams.append("cursor", params.cursor);
  }
  if (params?.limit) {
    searchParams.append("limit", params.limit.toString());
  }
  if (params?.playlistId) {
    searchParams.append("playlistId", params.playlistId);
  }
  const queryString = searchParams.toString();
  const path = queryString ? `/videos?${queryString}` : "/videos";
  return tellaFetch<ListVideosResponse>(path);
}

export async function getVideo(id: string): Promise<GetVideoResponse> {
  return tellaFetch<GetVideoResponse>(`/videos/${id}`);
}

export async function updateVideo(
  id: string,
  data: UpdateVideoRequest,
): Promise<GetVideoResponse> {
  return tellaFetch<GetVideoResponse>(`/videos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteVideo(id: string): Promise<void> {
  await tellaFetch<{ status: "ok" }>(`/videos/${id}`, {
    method: "DELETE",
  });
}

export async function duplicateVideo(
  id: string,
  name?: string,
): Promise<GetVideoResponse> {
  return tellaFetch<GetVideoResponse>(`/videos/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ name } as DuplicateVideoRequest),
  });
}

export async function startVideoExport(
  id: string,
  data: StartExportRequest,
): Promise<StartExportResponse> {
  return tellaFetch<StartExportResponse>(`/videos/${id}/exports`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Playlist Functions

export async function listPlaylists(
  params?: ListPlaylistsParams,
): Promise<ListPlaylistsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.visibility) {
    searchParams.append("visibility", params.visibility);
  }
  if (params?.cursor) {
    searchParams.append("cursor", params.cursor);
  }
  if (params?.limit) {
    searchParams.append("limit", params.limit.toString());
  }
  const queryString = searchParams.toString();
  const path = queryString ? `/playlists?${queryString}` : "/playlists";
  return tellaFetch<ListPlaylistsResponse>(path);
}

export async function createPlaylist(
  data: CreatePlaylistRequest,
): Promise<CreatePlaylistResponse> {
  return tellaFetch<CreatePlaylistResponse>("/playlists", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPlaylist(id: string): Promise<GetPlaylistResponse> {
  return tellaFetch<GetPlaylistResponse>(`/playlists/${id}`);
}

export async function updatePlaylist(
  id: string,
  data: UpdatePlaylistRequest,
): Promise<GetPlaylistResponse> {
  return tellaFetch<GetPlaylistResponse>(`/playlists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  await tellaFetch<{ status: "ok" }>(`/playlists/${id}`, {
    method: "DELETE",
  });
}

export async function addVideoToPlaylist(
  playlistId: string,
  videoId: string,
): Promise<void> {
  await tellaFetch<{ status: "ok" }>(`/playlists/${playlistId}/videos`, {
    method: "POST",
    body: JSON.stringify({ videoId } as AddVideoToPlaylistRequest),
  });
}

export async function removeVideoFromPlaylist(
  playlistId: string,
  videoId: string,
): Promise<void> {
  await tellaFetch<{ status: "ok" }>(
    `/playlists/${playlistId}/videos/${videoId}`,
    {
      method: "DELETE",
    },
  );
}
