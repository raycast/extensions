import { getPreferenceValues } from "@raycast/api";

const API_URL = "https://bookmarkjar.com";

interface Preferences {
  apiKey: string;
}

interface BookmarkPayload {
  url: string;
  title: string;
  source: "manual";
  sourceId: string;
  tags: string[];
  createdAt: string;
}

interface SyncResponse {
  synced: number;
  message: string;
  bookmarks: number;
}

interface ApiError {
  code: string;
  message: string;
  icon?: string;
}

export class BookmarkError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "BookmarkError";
  }
}

export async function addBookmark(url: string): Promise<SyncResponse> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const bookmark: BookmarkPayload = {
    url,
    title: url,
    source: "manual",
    sourceId: `raycast-${Date.now()}`,
    tags: [],
    createdAt: new Date().toISOString(),
  };

  const response = await fetch(`${API_URL}/api/bookmarks/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ bookmarks: [bookmark] }),
  });

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response);
    throw new BookmarkError(errorMessage);
  }

  return response.json() as Promise<SyncResponse>;
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    if (data.message) {
      return data.message;
    }
  } catch {
    // Not JSON, fall through
  }

  // Fallback for non-JSON errors
  if (response.status === 401) {
    return "Invalid API key. Please check your settings.";
  }
  if (response.status === 403) {
    return "Access denied. Your plan may have reached its limit.";
  }
  if (response.status === 404) {
    return "API endpoint not found. Please try again later.";
  }

  return `Request failed (${response.status})`;
}

export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
