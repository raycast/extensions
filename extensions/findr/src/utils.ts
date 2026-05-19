import { environment, getPreferenceValues } from "@raycast/api";
import { chmodSync, existsSync } from "fs";
import { join } from "path";

interface Preferences {
  findrPath: string;
  maxResults: string;
}

export function getFindrPath(): string {
  const { findrPath } = getPreferenceValues<Preferences>();

  // User override takes priority
  if (findrPath && existsSync(findrPath)) {
    return findrPath;
  }

  // Use bundled binary from assets (universal: arm64 + x86_64)
  // Source: https://github.com/Roderick111/findr (MIT, fully auditable)
  const bundled = join(environment.assetsPath, "findr");
  if (existsSync(bundled)) {
    try {
      chmodSync(bundled, 0o755);
    } catch {
      // May already be executable
    }
    return bundled;
  }

  return bundled;
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
