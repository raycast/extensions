export type PreviewKind = "image" | "pdf" | "markdown" | "text" | "video" | "audio" | "none";

const IMAGE_TYPES = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "heic",
  "avif",
];
const TEXT_TYPES = [
  "txt",
  "log",
  "json",
  "csv",
  "tsv",
  "yml",
  "yaml",
  "xml",
  "html",
  "css",
  "js",
];
const VIDEO_TYPES = ["mp4", "webm", "mov", "m4v", "ogv"];
const AUDIO_TYPES = ["mp3", "m4a", "wav", "ogg", "aac", "flac"];
const MARKDOWN_TYPES = ["md", "markdown", "mdown", "mkd", "mdx"];

export function previewKind(name: string): PreviewKind {
  const index = name.lastIndexOf(".");
  const extension = index === -1 ? "" : name.slice(index + 1).toLowerCase();
  if (extension === "pdf") return "pdf";
  if (IMAGE_TYPES.includes(extension)) return "image";
  if (VIDEO_TYPES.includes(extension)) return "video";
  if (AUDIO_TYPES.includes(extension)) return "audio";
  if (MARKDOWN_TYPES.includes(extension)) return "markdown";
  if (TEXT_TYPES.includes(extension)) return "text";
  return "none";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatDate(milliseconds: number): string {
  // Compact on purpose: the list keeps size and date in one line on a phone too.
  return new Date(milliseconds).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short enough to sit next to the file size on one phone line. */
export function formatRelativeDate(milliseconds: number): string {
  const minutes = Math.round((Date.now() - milliseconds) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(milliseconds);
}
