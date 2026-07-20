// MIME type mapping table
const MIME_TYPES: { [key: string]: string } = {
  // Image formats
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
  ".psd": "image/vnd.adobe.photoshop",

  // Document formats
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".rtf": "application/rtf",
  ".md": "text/markdown",
  ".markdown": "text/markdown",

  // Web related
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",

  // Compression formats
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",

  // Audio/Video formats
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".mkv": "video/x-matroska",

  // Office document formats
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Font formats
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
};

/**
 * Get the corresponding MIME type based on file extension
 * @param filePath File path
 * @returns Corresponding MIME type, returns default value "application/octet-stream" if not found
 */
export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf("."));
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Check if the file is an image format supported for AVIF conversion
 * @param filePath File path
 * @returns True if it is a supported image format, otherwise false
 */
export function isSupportedImageFormat(filePath: string): boolean {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf("."));
  const supportedFormats = [".jpg", ".jpeg", ".png", ".gif", ".tiff", ".bmp"];
  return supportedFormats.includes(ext);
}

/**
 * Check if the file is a compressed image format
 * @param filePath File path
 * @returns True if it is a compressed format, otherwise false
 */
export function isCompressedImageFormat(filePath: string): boolean {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf("."));
  return ext === ".webp" || ext === ".avif";
}
