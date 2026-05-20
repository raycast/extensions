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

export type WallpaperHistoryInput = Omit<
  WallpaperHistoryEntry,
  "eventId" | "timestamp"
>;

const EVENTS_DIR = path.join(environment.supportPath, "history", "events");

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

function getEventFiles() {
  if (!fs.existsSync(EVENTS_DIR)) return [];
  return fs.readdirSync(EVENTS_DIR).filter((file) => file.endsWith(".json"));
}

function readHistoryEntry(filePath: string) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return isHistoryEntry(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
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
  const entries: WallpaperHistoryEntry[] = [];
  const files = getEventFiles().sort((a, b) => b.localeCompare(a));

  for (const file of files) {
    const entry = readHistoryEntry(path.join(EVENTS_DIR, file));
    if (!entry) continue;

    entries.push(entry);
    if (options.limit && entries.length >= options.limit) break;
  }

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function findHistoryEventFilePath(eventId: string) {
  const files = getEventFiles();
  const fileNameMatch = files.find((file) => file.endsWith(`-${eventId}.json`));
  if (fileNameMatch) return path.join(EVENTS_DIR, fileNameMatch);

  for (const file of files) {
    const filePath = path.join(EVENTS_DIR, file);
    if (readHistoryEntry(filePath)?.eventId === eventId) return filePath;
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
  const files = getEventFiles();
  for (const file of files) {
    fs.unlinkSync(path.join(EVENTS_DIR, file));
  }

  return files.length;
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
