import { DocumentDimensions } from "../types";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const VALID_EXTENSIONS = new Set(["psd", "psb", "psdt", "pdd"]);

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const size = bytes / Math.pow(1024, index);
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${BYTE_UNITS[index]}`;
}

export function formatRelativeDate(date?: Date): string {
  if (!date || isNaN(date.getTime())) return "";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (elapsedSeconds < 60) return "Just now";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "Yesterday";
  if (elapsedDays < 7) return `${elapsedDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatDimensions(dimensions?: DocumentDimensions): string {
  if (!dimensions || !dimensions.width || !dimensions.height) return "";
  const base = `${dimensions.width} × ${dimensions.height} px`;
  return dimensions.dpi ? `${base} (${dimensions.dpi} DPI)` : base;
}

export function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

export function isValidPhotoshopExtension(ext: string): boolean {
  return VALID_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ""));
}
