import { LocalStorage } from "@raycast/api";

export type RecentUpload = {
  id?: string;
  file: string;
  url: string;
  uploadedAt: number;
  type?: "public" | "private" | "presigned";
  expiry?: number;
};

const RECENT_UPLOADS_KEY = "recentUploads";

export async function loadRecentUploads(): Promise<RecentUpload[]> {
  const raw = (await LocalStorage.getItem<string>(RECENT_UPLOADS_KEY)) || "[]";
  try {
    return JSON.parse(raw) as RecentUpload[];
  } catch {
    // Ignore JSON parse errors and use empty array
    return [];
  }
}

export async function saveRecentUploads(newLinks: RecentUpload[], limit = 50): Promise<void> {
  const existing = await loadRecentUploads();
  const merged = [...newLinks, ...existing].slice(0, limit);
  await LocalStorage.setItem(RECENT_UPLOADS_KEY, JSON.stringify(merged));
}
