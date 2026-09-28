import { Icon, Image } from "@raycast/api";
import path from "node:path";
import type { BucketObject, Destination, OutputFormat, Upload } from "../api/types";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "heic",
  "bmp",
  "svg",
  "tif",
  "tiff",
  "ico",
]);

export function isImageName(filename: string) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).slice(1).toLowerCase());
}

export function isImageUpload(upload: Upload) {
  return upload.mimeType.startsWith("image/") || isImageName(upload.filename);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/**
 * Mirrors Aktar's own OutputFormatter for links that don't come with
 * ready-made formats (bucket objects): images are embedded, anything else
 * is a plain link. There's no custom template here, so "custom" falls back
 * to the URL.
 */
export function formatLink(url: string, filename: string, format: OutputFormat) {
  const image = isImageName(filename);
  switch (format) {
    case "markdown":
      return image ? `![](${url})` : `[${filename}](${url})`;
    case "html":
      return image ? `<img src="${url}" alt="">` : `<a href="${url}">${filename}</a>`;
    default:
      return url;
  }
}

export const FORMAT_TITLES: Record<OutputFormat, string> = {
  url: "URL",
  markdown: "Markdown",
  html: "HTML",
  custom: "Custom Template",
};

export function fileIcon(filename: string): Image.ImageLike {
  const extension = path.extname(filename).slice(1).toLowerCase();
  if (isImageName(filename)) return Icon.Image;
  if (["mp4", "mov", "m4v", "webm", "mkv", "avi"].includes(extension)) return Icon.FilmStrip;
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(extension)) return Icon.Music;
  if (["zip", "gz", "tar", "rar", "7z", "dmg"].includes(extension)) return Icon.Box;
  if (["md", "txt", "rtf", "pdf", "doc", "docx", "pages"].includes(extension)) return Icon.Document;
  if (["json", "js", "ts", "tsx", "swift", "py", "html", "css", "sh", "yml", "yaml"].includes(extension)) {
    return Icon.Code;
  }
  return Icon.BlankDocument;
}

/** A thumbnail from the public link when there is one, the file-type icon otherwise. */
export function thumbnail(filename: string, url: string | null): Image.ImageLike {
  const fallback = fileIcon(filename);
  if (!url || !isImageName(filename)) return fallback;
  return { source: url, fallback: fallback as Image.Source };
}

export function destinationIcon(destination: Pick<Destination, "provider">): Image.ImageLike {
  switch (destination.provider) {
    case "cloudflareR2":
      return Icon.Cloud;
    case "amazonS3":
      return Icon.Box;
    case "minIO":
      return Icon.HardDrive;
    case "backblazeB2":
      return Icon.HardDrive;
    case "digitalOceanSpaces":
      return Icon.Globe;
    default:
      return Icon.Coins;
  }
}

/** The folder a key lives in: "a/b/c.png" -> "a/b/", "c.png" -> "". */
export function parentPrefix(key: string) {
  const slash = key.lastIndexOf("/");
  return slash === -1 ? "" : key.slice(0, slash + 1);
}

export function objectName(object: Pick<BucketObject, "key">) {
  return object.key.slice(parentPrefix(object.key).length);
}
