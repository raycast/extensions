/**
 * Runtime macOS capability checks
 *
 * Only contains the previewable image list — the one capability that
 * genuinely cannot be queried at runtime (Raycast's Chromium webview
 * rendering support is a fixed, stable set).
 *
 * EXIF and thumbnail support are handled by trying the underlying tool
 * (ExifReader / qlmanage) and catching errors, so no extension lists
 * are needed for those.
 */

import { extname } from "path";

/**
 * Image formats that Raycast can render inline in its Chromium-based webview.
 * This set is stable — browser image format support changes very rarely.
 */
const PREVIEWABLE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".ico",
  ".svg",
  ".heic",
  ".heif",
]);

/**
 * Check if a file extension is a previewable image format.
 *
 * These are image formats that can be rendered inline in Raycast's webview.
 */
export function isPreviewableImage(filePathOrExt: string): boolean {
  const extracted = extname(filePathOrExt);
  const ext = extracted || filePathOrExt;
  const normalizedExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return PREVIEWABLE_EXTENSIONS.has(normalizedExt);
}
