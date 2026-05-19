import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { homedir } from "os";

interface Preferences {
  findrPath: string;
  maxResults: string;
}

const COMMON_PATHS = [
  `${homedir()}/.cargo/bin/findr`,
  `${homedir()}/.local/bin/findr`,
  "/usr/local/bin/findr",
  "/opt/homebrew/bin/findr",
];

export function getFindrPath(): string {
  const { findrPath } = getPreferenceValues<Preferences>();

  // User-configured path takes priority
  if (findrPath && existsSync(findrPath)) {
    return findrPath;
  }

  // Auto-detect from common install locations
  for (const p of COMMON_PATHS) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Return user path or first common path (will trigger "not found" in UI)
  return findrPath || COMMON_PATHS[0];
}

export function getMaxResults(): number {
  const { maxResults } = getPreferenceValues<Preferences>();
  return parseInt(maxResults, 10) || 30;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  doc: "📝",
  docx: "📝",
  xls: "📊",
  xlsx: "📊",
  ppt: "📊",
  pptx: "📊",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  svg: "🖼️",
  webp: "🖼️",
  mp3: "🎵",
  mp4: "🎬",
  mov: "🎬",
  zip: "📦",
  tar: "📦",
  gz: "📦",
  md: "📋",
  txt: "📋",
  csv: "📋",
  json: "⚙️",
  yml: "⚙️",
  yaml: "⚙️",
  toml: "⚙️",
  rs: "🦀",
  ts: "💠",
  tsx: "💠",
  js: "💛",
  jsx: "💛",
  py: "🐍",
  go: "🐹",
  html: "🌐",
  css: "🎨",
  sh: "⚡",
};

export function getFileIcon(ext: string | null): string {
  if (!ext) return "📁";
  return FILE_TYPE_ICONS[ext] || "📁";
}
