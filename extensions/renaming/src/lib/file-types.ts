/**
 * File type detection using MIME types
 * Uses mime-types package instead of hardcoded extension lists
 */

import { Icon, Color } from "@raycast/api";
import { lookup } from "mime-types";
import { extname } from "path";
import { isPreviewableImage as osIsPreviewable } from "./os-capabilities";

/**
 * File categories with their display properties
 */
export const FILE_CATEGORIES = {
  image: { icon: Icon.Image, color: Color.Purple, label: "Image" },
  video: { icon: Icon.Video, color: Color.Red, label: "Video" },
  audio: { icon: Icon.Music, color: Color.Orange, label: "Audio" },
  document: { icon: Icon.Document, color: Color.Blue, label: "Document" },
  spreadsheet: { icon: Icon.Document, color: Color.Green, label: "Spreadsheet" },
  presentation: { icon: Icon.Document, color: Color.Orange, label: "Presentation" },
  archive: { icon: Icon.Box, color: Color.Yellow, label: "Archive" },
  code: { icon: Icon.Code, color: Color.Green, label: "Code" },
  text: { icon: Icon.Text, color: Color.SecondaryText, label: "Text" },
  font: { icon: Icon.Text, color: Color.Purple, label: "Font" },
  executable: { icon: Icon.Terminal, color: Color.Red, label: "Executable" },
  data: { icon: Icon.Document, color: Color.Blue, label: "Data" },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

/**
 * Two-tier MIME type categorization:
 *
 * 1. MIME_TYPE_TO_CATEGORY — checked first for specific MIME types where the
 *    prefix gives the wrong category (e.g., text/csv → spreadsheet, not text)
 *    or where there's no prefix mapping at all (all application/* types).
 *
 * 2. MIME_PREFIX_TO_CATEGORY — fallback for the 5 prefixes that directly map
 *    to categories (image/*, video/*, audio/*, text/*, font/*).
 *
 * The `application` prefix has no fallback mapping because application/* types
 * span many categories (documents, archives, code, executables, data).
 */
const MIME_PREFIX_TO_CATEGORY: Record<string, FileCategory> = {
  image: "image",
  video: "video",
  audio: "audio",
  text: "text",
  font: "font",
};

const MIME_TYPE_TO_CATEGORY: Record<string, FileCategory> = {
  // Documents
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.oasis.opendocument.text": "document",
  "application/rtf": "document",
  "application/vnd.apple.pages": "document",

  // Spreadsheets
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
  "application/vnd.oasis.opendocument.spreadsheet": "spreadsheet",
  "application/vnd.apple.numbers": "spreadsheet",
  "text/csv": "spreadsheet",

  // Presentations
  "application/vnd.ms-powerpoint": "presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "presentation",
  "application/vnd.oasis.opendocument.presentation": "presentation",
  "application/vnd.apple.keynote": "presentation",

  // Archives
  "application/zip": "archive",
  "application/x-tar": "archive",
  "application/gzip": "archive",
  "application/x-gzip": "archive",
  "application/x-bzip2": "archive",
  "application/x-xz": "archive",
  "application/x-7z-compressed": "archive",
  "application/x-rar-compressed": "archive",
  "application/vnd.rar": "archive",

  // Code & Config
  "application/javascript": "code",
  "application/typescript": "code",
  "application/json": "code",
  "application/xml": "code",
  "application/x-yaml": "code",
  "application/toml": "code",
  "text/javascript": "code",
  "text/typescript": "code",
  "text/x-python": "code",
  "text/x-java-source": "code",
  "text/x-c": "code",
  "text/x-c++": "code",
  "text/x-ruby": "code",
  "text/x-go": "code",
  "text/x-rust": "code",
  "text/x-swift": "code",
  "text/html": "code",
  "text/css": "code",
  "text/x-shellscript": "code",

  // Executables
  "application/x-executable": "executable",
  "application/x-mach-binary": "executable",
  "application/x-msdownload": "executable",
  "application/vnd.apple.installer+xml": "executable",
  "application/x-apple-diskimage": "executable",

  // Data formats
  "application/x-sqlite3": "data",
  "application/vnd.sqlite3": "data",
};

/**
 * Get MIME type for a file path
 */
export function getMimeType(filePath: string): string | null {
  const mime = lookup(filePath);
  return mime || null;
}

/**
 * Get file category from MIME type
 */
function getCategoryFromMime(mimeType: string): FileCategory | null {
  // Check specific MIME type first
  if (mimeType in MIME_TYPE_TO_CATEGORY) {
    return MIME_TYPE_TO_CATEGORY[mimeType] ?? null;
  }

  // Fall back to prefix-based mapping
  const prefix = mimeType.split("/")[0]!;
  if (prefix in MIME_PREFIX_TO_CATEGORY) {
    return MIME_PREFIX_TO_CATEGORY[prefix] ?? null;
  }

  return null;
}

/**
 * Get the file category for a file path
 */
export function getFileCategory(filePath: string): FileCategory | null {
  const mime = getMimeType(filePath);
  if (!mime) return null;
  return getCategoryFromMime(mime);
}

/**
 * Get icon and color for a file based on its type
 */
export function getFileTypeIcon(filePath: string): { source: Icon; tintColor?: Color } {
  const category = getFileCategory(filePath);

  if (category && category in FILE_CATEGORIES) {
    const { icon, color } = FILE_CATEGORIES[category];
    return { source: icon, tintColor: color };
  }

  return { source: Icon.Document, tintColor: Color.Blue };
}

/**
 * Get human-readable label for a file type
 */
export function getFileTypeLabel(filePath: string): string {
  const category = getFileCategory(filePath);

  if (category && category in FILE_CATEGORIES) {
    return FILE_CATEGORIES[category].label;
  }

  const ext = extname(filePath).toLowerCase();
  return ext ? ext.slice(1).toUpperCase() : "File";
}

/**
 * Check if a file is an image (by MIME type)
 */
export function isImage(filePath: string): boolean {
  const mime = getMimeType(filePath);
  return mime?.startsWith("image/") ?? false;
}

/**
 * Check if a file is a video (by MIME type)
 */
export function isVideo(filePath: string): boolean {
  const mime = getMimeType(filePath);
  return mime?.startsWith("video/") ?? false;
}

/**
 * Check if a file is audio (by MIME type)
 */
export function isAudio(filePath: string): boolean {
  const mime = getMimeType(filePath);
  return mime?.startsWith("audio/") ?? false;
}

/**
 * Check if a file is a media file (image, video, or audio)
 */
export function isMedia(filePath: string): boolean {
  return isImage(filePath) || isVideo(filePath) || isAudio(filePath);
}

/**
 * Check if a file can be previewed as an image in Raycast
 */
export function isPreviewableImage(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return osIsPreviewable(ext);
}
