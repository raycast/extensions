import { getPreferenceValues, LocalStorage } from "@raycast/api";

const BASE_URL = "https://bucket.aevr.space/api/v1";

interface Preferences {
  apiToken?: string;
  authMethod: "apiKey" | "device";
}

async function getHeaders() {
  const prefs = getPreferenceValues<Preferences>();

  let token: string | undefined;

  if (prefs.authMethod === "device") {
    // Use device token from local storage
    token = await LocalStorage.getItem<string>("device-token");
  } else {
    // Use API key from preferences
    token = prefs.apiToken;
  }

  if (!token) {
    throw new Error(
      "Not authenticated. Please connect your device or add an API token.",
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Bucket API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Bookmark {
  _id: string;
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  ogImage?: string;
  siteName?: string;
  tags?: string[];
  featured?: boolean;
  isPrivate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Folder {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  isPrivate?: boolean;
  tags?: string[];
}

export interface CreateBookmarkInput {
  url: string;
  title?: string;
  tags?: string[];
  description?: string;
  favicon?: string;
  ogImage?: string;
  siteName?: string;
}

export interface UpdateBookmarkInput {
  title?: string;
  tags?: string[];
  description?: string;
  featured?: boolean;
  isPrivate?: boolean;
}

export interface DeviceLinkResponse {
  success: boolean;
  message: string;
  code: string;
  url: string;
}

export interface DeviceStatusResponse {
  success: boolean;
  status: "pending" | "approved" | "rejected" | "expired";
  message?: string;
  token?: string;
  user?: {
    name?: string;
    email: string;
    paytag?: string;
    points: number;
  };
}

// ── Device Authentication ──────────────────────────────────────────────────

export async function initDeviceLink(
  deviceId: string,
  deviceName: string,
): Promise<DeviceLinkResponse> {
  const res = await fetch(`${BASE_URL}/auth/device/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, deviceName }),
  });

  if (!res.ok) {
    throw new Error(`Failed to initialize device link: ${res.status}`);
  }

  return res.json();
}

export async function checkDeviceStatus(
  code: string,
): Promise<DeviceStatusResponse> {
  const res = await fetch(
    `${BASE_URL}/auth/device/status?code=${encodeURIComponent(code)}`,
    {
      method: "GET",
    },
  );

  if (!res.ok && res.status !== 403 && res.status !== 400) {
    throw new Error(`Failed to check device status: ${res.status}`);
  }

  return res.json();
}

// ── Bookmarks ──────────────────────────────────────────────────────────────

export async function getBookmarks(since?: string): Promise<Bookmark[]> {
  const url = since
    ? `/bookmarks?since=${encodeURIComponent(since)}`
    : "/bookmarks";
  const data = await request<
    { bookmarks?: Bookmark[]; data?: Bookmark[] } | Bookmark[]
  >(url);
  // Handle various response shapes
  if (Array.isArray(data)) return data;
  if ("bookmarks" in data && Array.isArray(data.bookmarks))
    return data.bookmarks;
  if ("data" in data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function createBookmark(
  input: CreateBookmarkInput,
): Promise<Bookmark> {
  return request<Bookmark>("/bookmarks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBookmark(
  id: string,
  input: UpdateBookmarkInput,
): Promise<Bookmark> {
  return request<Bookmark>(`/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBookmark(id: string): Promise<void> {
  await request(`/bookmarks/${id}`, { method: "DELETE" });
}

// ── Folders ────────────────────────────────────────────────────────────────

export async function getFolders(parentId?: string): Promise<Folder[]> {
  const url = parentId
    ? `/folders?parentId=${encodeURIComponent(parentId)}`
    : "/folders";
  const data = await request<
    { folders?: Folder[]; data?: Folder[] } | Folder[]
  >(url);
  if (Array.isArray(data)) return data;
  if ("folders" in data && Array.isArray(data.folders)) return data.folders;
  if ("data" in data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function moveBookmarksToFolder(
  folderId: string,
  bookmarkIds: string[],
): Promise<void> {
  await request(`/folders/${folderId}/bookmarks`, {
    method: "POST",
    body: JSON.stringify({ bookmarkIds }),
  });
}

// ── User ───────────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<{
  firstName?: string;
  lastName?: string;
  email?: string;
}> {
  return request("/user/profile");
}

export async function triggerOrganize(): Promise<void> {
  await request("/user/organize", { method: "POST" });
}
