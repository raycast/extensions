import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { getAccessToken, isProUser } from "./auth";

export interface LocalHighlight {
  id: string;
  videoId: string;
  userId: string;
  startTime: number;
  endTime: number;
  text: string;
  color: string;
  tags: string[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;

  deletedAt?: number;

  videoTitle: string;
  videoUrl: string;
  videoChannel?: string;
  videoDuration?: number;
  videoThumbnail?: string;

  browser?: string;
  videoType?: "video" | "short" | "ad" | "live";
}

export type Highlight = LocalHighlight;

interface ServerHighlight {
  highlightId: string;
  videoId: string;
  userId?: string;
  startTime: number;
  endTime: number;
  text: string;
  color: string;
  tags?: Record<string, boolean>;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  videoTitle?: string;
  videoUrl?: string;
  channelName?: string;
  videoThumbnail?: string;
}

interface BackupInfo {
  backupId: string;
}

const STORAGE_KEY = "highlights";

const API_BASE_URL = "https://api.youtubehighlightsapp.com";

const CLIENT_ID = "raycast";
const CLIENT_VERSION = "1.0.0";
const DEVICE_ID_KEY = "device_id";

let cachedDeviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let deviceId = await LocalStorage.getItem<string>(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `raycast-${randomUUID()}`;
    await LocalStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  cachedDeviceId = deviceId;
  return deviceId;
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not signed in");

  const deviceId = await getDeviceId();

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Client-ID": CLIENT_ID,
      "X-Client-Version": CLIENT_VERSION,
      "X-Device-ID": deviceId,
      ...options.headers,
    },
  });
}

export function getVideoId(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com")) {
      if (urlObj.pathname.startsWith("/shorts/")) {
        return urlObj.pathname.split("/")[2];
      }
      return urlObj.searchParams.get("v") || "";
    } else if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1);
    }
  } catch {
    // URL parsing failed
  }
  return "";
}

async function getAllHighlights(): Promise<LocalHighlight[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    const parsed = JSON.parse(data);
    return parsed;
  } catch {
    return [];
  }
}

export async function getHighlights(): Promise<LocalHighlight[]> {
  const allHighlights = await getAllHighlights();
  const activeHighlights = allHighlights.filter((h) => !h.deletedAt);
  return activeHighlights;
}

export async function saveHighlight(
  highlight: Omit<LocalHighlight, "id" | "createdAt" | "updatedAt">,
): Promise<LocalHighlight> {
  const highlights = await getAllHighlights();

  const newHighlight: LocalHighlight = {
    ...highlight,
    id: randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedHighlights = [newHighlight, ...highlights];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHighlights));

  if (await isProUser()) {
    syncHighlights().catch(() => {});
  }

  return newHighlight;
}

export async function deleteHighlight(id: string): Promise<void> {
  const allHighlights = await getAllHighlights();
  const index = allHighlights.findIndex((h) => h.id === id);

  if (index !== -1) {
    allHighlights[index] = {
      ...allHighlights[index],
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allHighlights));

    if (await isProUser()) {
      syncHighlights().catch(() => {});
    }
  }
}

export async function clearHighlights(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

export async function updateHighlight(id: string, updates: Partial<LocalHighlight>): Promise<void> {
  const highlights = await getHighlights();
  const index = highlights.findIndex((h) => h.id === id);
  if (index !== -1) {
    highlights[index] = { ...highlights[index], ...updates, updatedAt: Date.now() };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));

    if (await isProUser()) {
      syncHighlights().catch(() => {});
    }
  }
}

export async function checkForDuplicate(
  videoId: string,
  startTime: number,
  endTime: number,
): Promise<LocalHighlight | undefined> {
  const highlights = await getHighlights();
  return highlights.find((h) => {
    if (h.videoId !== videoId) return false;
    const overlapStart = Math.max(h.startTime, startTime);
    const overlapEnd = Math.min(h.endTime, endTime);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    const minDuration = Math.min(h.endTime - h.startTime, endTime - startTime);
    return overlapDuration > minDuration * 0.5;
  });
}

export async function mergeHighlights(ids: string[]): Promise<void> {
  if (ids.length < 2) return;
  const highlights = await getHighlights();
  const toMerge = highlights.filter((h) => ids.includes(h.id));
  if (toMerge.length < 2) return;

  toMerge.sort((a, b) => a.startTime - b.startTime);
  const base = toMerge[0];
  const startTime = base.startTime;
  const endTime = Math.max(...toMerge.map((h) => h.endTime));
  const texts = toMerge
    .map((h) => h.text)
    .filter((t) => t)
    .join("\n\n");

  const allHighlights = await getAllHighlights();
  const idx = allHighlights.findIndex((h) => h.id === base.id);
  if (idx !== -1) {
    allHighlights[idx] = { ...allHighlights[idx], startTime, endTime, text: texts, updatedAt: Date.now() };
  }

  const idsToDelete = new Set(toMerge.slice(1).map((h) => h.id));
  for (const h of allHighlights) {
    if (idsToDelete.has(h.id)) {
      h.deletedAt = Date.now();
      h.updatedAt = Date.now();
    }
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allHighlights));

  if (await isProUser()) {
    syncHighlights().catch(() => {});
  }
}

export async function syncHighlights(): Promise<void> {
  try {
    const localHighlights = await getAllHighlights();

    const highlights = localHighlights.map((h) => ({
      highlightId: h.id,
      videoId: h.videoId,
      videoTitle: h.videoTitle,
      videoThumbnail: h.videoThumbnail || "",
      channelName: h.videoChannel || "",
      startTime: h.startTime,
      endTime: h.endTime,
      title: "",
      text: h.text,
      color: h.color,
      tags: h.tags.reduce((acc, tag) => ({ ...acc, [tag]: true }), {}),
      createdAt: new Date(h.createdAt).toISOString(),
      updatedAt: new Date(h.updatedAt).toISOString(),
      deletedAt: h.deletedAt ? new Date(h.deletedAt).toISOString() : undefined,
    }));

    const response = await apiRequest("/api/v1/highlights/sync", {
      method: "POST",
      body: JSON.stringify({ lastSyncedAt: null, highlights }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: { highlights: ServerHighlight[] } };

    const serverHighlights: LocalHighlight[] = data.data.highlights.map((h) => ({
      id: h.highlightId,
      videoId: h.videoId,
      userId: h.userId || "local-user",
      startTime: h.startTime,
      endTime: h.endTime,
      text: h.text,
      color: h.color,
      tags: Object.keys(h.tags || {}),
      isPublic: h.isPublic || false,
      createdAt: new Date(h.createdAt).getTime(),
      updatedAt: new Date(h.updatedAt).getTime(),
      deletedAt: h.deletedAt ? new Date(h.deletedAt).getTime() : undefined,
      videoTitle: h.videoTitle || "",
      videoUrl: h.videoUrl || `https://youtube.com/watch?v=${h.videoId}`,
      videoChannel: h.channelName,
      videoThumbnail: h.videoThumbnail,
    }));

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(serverHighlights));
  } catch {
    // Sync failed silently
  }
}

export async function backupHighlights(): Promise<void> {
  const localHighlights = await getAllHighlights();

  const highlights = [];

  for (const h of localHighlights) {
    const createdAt = h.createdAt || Date.now();
    const updatedAt = h.updatedAt || createdAt;
    const videoId = h.videoId || getVideoId(h.videoUrl || "");

    if (!videoId) {
      continue;
    }

    highlights.push({
      highlightId: h.id,
      videoId: videoId,
      videoTitle: h.videoTitle || "",
      videoThumbnail: h.videoThumbnail || "",
      channelName: h.videoChannel || "",
      startTime: h.startTime || 0,
      endTime: h.endTime || 0,
      title: "",
      text: h.text || "",
      color: h.color || "#FFC107",
      tags: h.tags?.reduce((acc, tag) => ({ ...acc, [tag]: true }), {}) || {},
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    });
  }

  const response = await apiRequest("/api/v1/highlights/backup", {
    method: "POST",
    body: JSON.stringify({ highlights }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { details?: string };
    throw new Error(`Backup failed: ${response.statusText} - ${errorData.details || ""}`);
  }
}

export async function restoreHighlights(): Promise<void> {
  const backupsResponse = await apiRequest("/api/v1/highlights/backups", {
    method: "GET",
  });

  if (!backupsResponse.ok) {
    throw new Error(`Failed to list backups: ${backupsResponse.statusText}`);
  }

  const backupsData = (await backupsResponse.json()) as { data: { backups: BackupInfo[] } };

  if (!backupsData.data.backups.length) {
    throw new Error("No backups found");
  }

  const latestBackup = backupsData.data.backups[0];

  const restoreResponse = await apiRequest("/api/v1/highlights/restore", {
    method: "POST",
    body: JSON.stringify({ backupId: latestBackup.backupId }),
  });

  if (!restoreResponse.ok) {
    throw new Error(`Restore failed: ${restoreResponse.statusText}`);
  }

  const restoreData = (await restoreResponse.json()) as { data: { highlights: Record<string, unknown>[] } };
  const rawHighlights = restoreData.data.highlights;

  if (!Array.isArray(rawHighlights)) {
    throw new Error("Invalid restore data: highlights is not an array");
  }

  const serverHighlights: LocalHighlight[] = [];

  for (const h of rawHighlights) {
    if (!h || typeof h !== "object" || !h.highlightId || !h.createdAt) {
      continue;
    }

    const videoId = h.videoId as string;
    if (!videoId) {
      continue;
    }

    const startTime = typeof h.startTime === "number" ? h.startTime : Number(h.startTime) || 0;
    const endTime = typeof h.endTime === "number" ? h.endTime : Number(h.endTime) || 0;
    const createdTs = new Date(h.createdAt as string).getTime();
    const updatedTs = h.updatedAt ? new Date(h.updatedAt as string).getTime() : createdTs;

    if (isNaN(createdTs)) {
      continue;
    }

    serverHighlights.push({
      id: String(h.highlightId),
      videoId: videoId,
      userId: String(h.userId || "local-user"),
      startTime,
      endTime,
      text: String(h.text || ""),
      color: String(h.color || "#FFC107"),
      tags: Array.isArray(h.tags) ? h.tags : Object.keys((h.tags as Record<string, unknown>) || {}),
      isPublic: h.isPublic === true,
      createdAt: createdTs,
      updatedAt: updatedTs,
      videoTitle: String(h.videoTitle || ""),
      videoUrl: h.videoUrl ? String(h.videoUrl) : `https://youtube.com/watch?v=${videoId}`,
      videoChannel: String(h.channelName || ""),
      videoThumbnail: String(h.videoThumbnail || ""),
    });
  }

  const localHighlights = await getAllHighlights();
  const localMap = new Map(localHighlights.map((h) => [h.id, h]));

  for (const remote of serverHighlights) {
    const local = localMap.get(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      localMap.set(remote.id, remote);
    }
  }

  const merged = Array.from(localMap.values());
  merged.sort((a, b) => b.createdAt - a.createdAt); // newest first
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export async function syncHighlightsDown(): Promise<void> {
  try {
    if (await isProUser()) {
      await syncHighlights();
      return;
    }

    const backupsResponse = await apiRequest("/api/v1/highlights/backups", { method: "GET" });
    if (!backupsResponse.ok) return; // Silent fail

    const backupsData = (await backupsResponse.json()) as { data: { backups: BackupInfo[] } };
    if (!backupsData.data.backups.length) return;

    const latestBackup = backupsData.data.backups[0];
    const restoreResponse = await apiRequest("/api/v1/highlights/restore", {
      method: "POST",
      body: JSON.stringify({ backupId: latestBackup.backupId }),
    });
    if (!restoreResponse.ok) return;

    const restoreData = (await restoreResponse.json()) as { data: { highlights: Record<string, unknown>[] } };
    const rawHighlights = restoreData.data.highlights;
    if (!Array.isArray(rawHighlights)) return;

    const serverHighlights: LocalHighlight[] = [];
    for (const h of rawHighlights) {
      if (!h || typeof h !== "object" || !h.highlightId || !h.createdAt) continue;

      serverHighlights.push({
        id: h.highlightId as string,
        videoId: h.videoId as string,
        userId: (h.userId as string) || "local-user",
        startTime: h.startTime as number,
        endTime: h.endTime as number,
        text: h.text as string,
        color: h.color as string,
        tags: Object.keys((h.tags as Record<string, unknown>) || {}),
        isPublic: (h.isPublic as boolean) || false,
        createdAt: new Date(h.createdAt as string).getTime(),
        updatedAt: new Date(h.updatedAt as string).getTime(),
        videoTitle: h.videoTitle as string,
        videoUrl: `https://youtube.com/watch?v=${h.videoId as string}`,
        videoChannel: h.channelName as string,
        videoThumbnail: h.videoThumbnail as string,
      });
    }

    const localHighlights = await getAllHighlights();
    const localMap = new Map(localHighlights.map((h) => [h.id, h]));
    let hasChanges = false;

    for (const remote of serverHighlights) {
      const local = localMap.get(remote.id);

      if (!local) {
        localMap.set(remote.id, remote);
        hasChanges = true;
      } else if (remote.updatedAt > local.updatedAt) {
        localMap.set(remote.id, remote);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const merged = Array.from(localMap.values());
      merged.sort((a, b) => b.createdAt - a.createdAt);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  } catch {
    // Background sync failed silently
  }
}
