import crypto from "crypto";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import type { Wallpaper } from "./utils";

export type WallpaperHistoryEventType =
  "selected" | "downloaded" | "auto-switched";

export type WallpaperHistoryEntry = {
  eventId: string;
  eventType: WallpaperHistoryEventType;
  timestamp: string;
  wallpaper: Wallpaper;
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
    (entry.eventType === "selected" ||
      entry.eventType === "downloaded" ||
      entry.eventType === "auto-switched") &&
    typeof entry.timestamp === "string" &&
    isWallpaper(entry.wallpaper) &&
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
    if (!isHistoryEntry(parsed)) return undefined;
    return {
      eventId: parsed.eventId,
      eventType: parsed.eventType,
      timestamp: parsed.timestamp,
      wallpaper: parsed.wallpaper,
      downloadPath: parsed.downloadPath,
    };
  } catch {
    return undefined;
  }
}

export function recordWallpaperHistory(
  input: WallpaperHistoryInput,
): WallpaperHistoryEntry {
  ensureHistoryDirectories();

  const timestamp = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const entry: WallpaperHistoryEntry = {
    eventId,
    eventType: input.eventType,
    timestamp,
    wallpaper: input.wallpaper,
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

  return entries;
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

export function recordWallpaperHistoryBestEffort(input: WallpaperHistoryInput) {
  try {
    recordWallpaperHistory(input);
  } catch (error) {
    console.error("Failed to record wallpaper history:", error);
  }
}
