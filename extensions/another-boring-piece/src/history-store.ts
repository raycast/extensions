import crypto from "crypto";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import type { Wallpaper } from "./utils";

export type WallpaperHistoryEventType = "selected" | "downloaded";

export type WallpaperHistoryEntry = {
  eventId: string;
  eventType: WallpaperHistoryEventType;
  timestamp: string;
  wallpaper: Wallpaper;
  localFilePath: string;
  downloadPath?: string;
};

export type WallpaperHistoryInput = {
  eventType: WallpaperHistoryEventType;
  wallpaper: Wallpaper;
  localFilePath: string;
  downloadPath?: string;
};

const HISTORY_DIR = path.join(environment.supportPath, "history");
const EVENTS_DIR = path.join(HISTORY_DIR, "events");

function ensureHistoryDirectories() {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function isWallpaper(value: unknown): value is Wallpaper {
  if (!value || typeof value !== "object") return false;
  const wallpaper = value as Record<string, unknown>;
  return (
    typeof wallpaper.id === "string" &&
    typeof wallpaper.name === "string" &&
    typeof wallpaper.url === "string" &&
    typeof wallpaper.description === "string" &&
    typeof wallpaper.artist === "string" &&
    typeof wallpaper.creationDate === "string"
  );
}

function isHistoryEntry(value: unknown): value is WallpaperHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.eventId === "string" &&
    (entry.eventType === "selected" || entry.eventType === "downloaded") &&
    typeof entry.timestamp === "string" &&
    isWallpaper(entry.wallpaper) &&
    typeof entry.localFilePath === "string" &&
    (entry.downloadPath === undefined || typeof entry.downloadPath === "string")
  );
}

export async function recordWallpaperHistory(
  input: WallpaperHistoryInput,
): Promise<WallpaperHistoryEntry> {
  ensureHistoryDirectories();

  const timestamp = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const entry: WallpaperHistoryEntry = {
    eventId,
    eventType: input.eventType,
    timestamp,
    wallpaper: input.wallpaper,
    localFilePath: input.localFilePath,
    downloadPath: input.downloadPath,
  };

  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const safeWallpaperId = sanitizeFileName(input.wallpaper.id);
  const fileName = `${safeTimestamp}-${input.eventType}-${safeWallpaperId}-${eventId}.json`;
  fs.writeFileSync(
    path.join(EVENTS_DIR, fileName),
    JSON.stringify(entry, null, 2),
  );
  return entry;
}

export function readWallpaperHistory(
  options: { limit?: number } = {},
): WallpaperHistoryEntry[] {
  if (!fs.existsSync(EVENTS_DIR)) return [];

  const entries: WallpaperHistoryEntry[] = [];
  const files = fs
    .readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(EVENTS_DIR, file), "utf8");
      const parsed = JSON.parse(raw);
      if (isHistoryEntry(parsed)) {
        entries.push(parsed);
        if (options.limit && entries.length >= options.limit) break;
      }
    } catch {
      continue;
    }
  }

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function findHistoryEventFilePath(eventId: string) {
  if (!fs.existsSync(EVENTS_DIR)) return undefined;

  const files = fs
    .readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith(".json"));
  const fileNameMatch = files.find((file) => file.endsWith(`-${eventId}.json`));
  if (fileNameMatch) return path.join(EVENTS_DIR, fileNameMatch);

  for (const file of files) {
    const filePath = path.join(EVENTS_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (isHistoryEntry(parsed) && parsed.eventId === eventId) return filePath;
    } catch {
      continue;
    }
  }

  return undefined;
}

export function deleteWallpaperHistoryEntry(eventId: string) {
  const filePath = findHistoryEventFilePath(eventId);
  if (!filePath) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function clearWallpaperHistory() {
  if (!fs.existsSync(EVENTS_DIR)) return 0;

  let deletedCount = 0;
  const files = fs
    .readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith(".json"));
  for (const file of files) {
    fs.unlinkSync(path.join(EVENTS_DIR, file));
    deletedCount += 1;
  }

  return deletedCount;
}

export async function recordWallpaperHistoryBestEffort(
  input: WallpaperHistoryInput,
) {
  try {
    await recordWallpaperHistory(input);
  } catch (error) {
    console.error("Failed to record wallpaper history:", error);
  }
}
