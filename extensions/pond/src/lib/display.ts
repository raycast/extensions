import { type ApiSave, SOURCES, sourceLabel } from "pond-api";
import { hostname } from "./links";

const LINKS = /https?:\/\/\S+/g;
const TRAILING_HASHTAGS = /(?:\s*#[\p{L}\p{N}_]+)+\s*$/u;
const MARKDOWN_SYNTAX = /[\\`*_{}[\]()#+\-.!>|~<]/g;
const DAY = 86_400_000;

const KINDS = new Map([
  ["image", "Image"],
  ["video", "Video"],
  ["audio", "Audio"],
  ["document", "Document"],
  ["font", "Font"],
  ["file", "File"],
  ["link", "Website"],
  ["text", "Text"],
]);

export function sourceName(source: string): string {
  const known = SOURCES.find((id) => id === source);
  return known ? sourceLabel(known) : source;
}

export function kindName(kind: string | null): string | null {
  return kind ? (KINDS.get(kind) ?? kind) : null;
}

/** Captions often end in link shorteners and hashtag runs that crowd out the words you search by. */
export function saveTitle(save: Pick<ApiSave, "title" | "description" | "author" | "url">): string {
  const caption = (save.title || save.description || "").replace(LINKS, "").replace(/\s+/g, " ").trim();
  const words = caption.replace(TRAILING_HASHTAGS, "").trim();
  return words || caption || save.author || hostname(save.url) || "Untitled Save";
}

export function escapeMarkdown(value: string): string {
  return value.replace(MARKDOWN_SYNTAX, "\\$&");
}

export function savedSection(saved: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(saved)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 Days";
  if (days < 30) return "Previous 30 Days";
  return saved.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export interface Section<Item> {
  title: string;
  items: Item[];
}

export function sectionsBySavedDay<Item extends { savedAt: number }>(
  items: readonly Item[],
  now: Date,
): Section<Item>[] {
  const sections: Section<Item>[] = [];
  for (const item of items) {
    const title = savedSection(new Date(item.savedAt), now);
    const last = sections.at(-1);
    if (last?.title === title) last.items.push(item);
    else sections.push({ title, items: [item] });
  }
  return sections;
}

export function formatDate(value: number): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

export function formatDimensions(media: ApiSave["media"]): string | null {
  return media.width && media.height ? `${media.width} × ${media.height}` : null;
}

export function ratingStars(rating: number | null): string | null {
  return rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : null;
}

export interface FolderPath {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  color: string | null;
  count: number;
}

/** Folders nest, so a bare name is ambiguous when two parents share a child name. */
export function folderPaths(
  folders: readonly { id: string; name: string; parentId: string | null; color: string | null; count: number }[],
): FolderPath[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  function path(id: string, seen: Set<string>): string {
    const folder = byId.get(id);
    if (!folder) return "";
    if (!folder.parentId || seen.has(folder.parentId)) return folder.name;
    seen.add(id);
    const parent = path(folder.parentId, seen);
    return parent ? `${parent} / ${folder.name}` : folder.name;
  }
  return folders
    .map((folder) => ({ ...folder, path: path(folder.id, new Set()) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
