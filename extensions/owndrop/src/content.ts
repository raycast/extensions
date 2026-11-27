import { extractUrl, type DropItem } from "./api";

export type DropKind = "text" | "link" | "image" | "video" | "audio" | "pdf" | "file";

export function getDropKind(item: DropItem): DropKind {
  if (item.type === "text") return extractUrl(item.text) ? "link" : "text";
  const mime = item.mime?.split(";")[0].toLowerCase();
  const extension = item.name?.split(".").pop()?.toLowerCase() ?? "";
  if (item.type === "image" || mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  // Older uploads may have been stored as application/octet-stream.
  if (!mime || mime === "application/octet-stream") {
    if (["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"].includes(extension)) return "image";
    if (["mp4", "mov", "webm", "m4v", "mkv", "avi"].includes(extension)) return "video";
    if (["mp3", "m4a", "wav", "ogg", "flac", "aac"].includes(extension)) return "audio";
    if (extension === "pdf") return "pdf";
  }
  return "file";
}

export function escapeMarkdown(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&");
}
