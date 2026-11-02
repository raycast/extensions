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

export type WallpaperHistoryItem = WallpaperHistoryEntry & {
  events: WallpaperHistoryEntry[];
};

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

function parseHistoryEntry(contents: string) {
  try {
    const parsed = JSON.parse(contents);
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

function readHistoryEntry(filePath: string) {
  try {
    return parseHistoryEntry(fs.readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

async function readHistoryEntryAsync(filePath: string) {
  try {
    return parseHistoryEntry(await fs.promises.readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

export async function getExistingHistoryDownloadPath(
  item: WallpaperHistoryItem,
) {
  for (const event of item.events) {
    if (!event.downloadPath) continue;
    try {
      await fs.promises.access(event.downloadPath);
      return event.downloadPath;
    } catch {
      // Try an older download if this file was removed.
    }
  }
  return undefined;
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

export async function readWallpaperHistory(
  options: { limit?: number } = {},
): Promise<WallpaperHistoryItem[]> {
  const entries = new Map<string, WallpaperHistoryItem>();
  let files: string[];
  try {
    files = await fs.promises.readdir(EVENTS_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  files = files
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a));

  // Bound concurrent reads while retaining all events for the visible artworks.
  for (let offset = 0; offset < files.length; offset += 32) {
    const batch = await Promise.all(
      files
        .slice(offset, offset + 32)
        .map((file) => readHistoryEntryAsync(path.join(EVENTS_DIR, file))),
    );
    for (const entry of batch) {
      if (!entry) continue;
      const item = entries.get(entry.wallpaper.id);
      if (item) {
        item.events.push(entry);
      } else if (!options.limit || entries.size < options.limit) {
        entries.set(entry.wallpaper.id, { ...entry, events: [entry] });
      }
    }
  }
  return [...entries.values()];
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

export type WallpaperHistorySearch = {
  query?: string;
  fromDate?: string;
  toDate?: string;
  eventType?: WallpaperHistoryEventType;
};

function parseHistoryDate(value: string, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("History dates must use YYYY-MM-DD format.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid history date: ${value}`);
  }
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.getTime();
}

export async function searchWallpaperHistory(
  options: WallpaperHistorySearch = {},
): Promise<WallpaperHistoryItem[]> {
  const from = options.fromDate
    ? parseHistoryDate(options.fromDate)
    : undefined;
  const to = options.toDate
    ? parseHistoryDate(options.toDate, true)
    : undefined;
  if (from !== undefined && to !== undefined && from >= to) {
    throw new Error("History start date must not be after the end date.");
  }
  const words =
    options.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) || [];
  const results: WallpaperHistoryItem[] = [];
  for (const item of await readWallpaperHistory()) {
    const wallpaper = item.wallpaper;
    const text = [
      wallpaper.id,
      wallpaper.name,
      wallpaper.artist,
      wallpaper.description,
      wallpaper.creationDate,
    ]
      .join(" ")
      .toLowerCase();
    if (!words.every((word) => text.includes(word))) continue;

    const events = item.events.filter((event) => {
      if (options.eventType && event.eventType !== options.eventType)
        return false;
      const timestamp = new Date(event.timestamp).getTime();
      return (
        (from === undefined || timestamp >= from) &&
        (to === undefined || timestamp < to)
      );
    });
    if (events.length) results.push({ ...events[0], events });
  }
  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function deleteWallpaperHistoryEntry(eventId: string) {
  const filePath = findHistoryEventFilePath(eventId);
  if (!filePath) return false;
  const entry = readHistoryEntry(filePath);
  if (!entry) return false;

  for (const file of getEventFiles()) {
    const candidatePath = path.join(EVENTS_DIR, file);
    if (readHistoryEntry(candidatePath)?.wallpaper.id === entry.wallpaper.id) {
      fs.unlinkSync(candidatePath);
    }
  }
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
