const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".heic": "image/heic",
};

export function getMimeType(fileName?: string) {
  if (!fileName) {
    return "application/octet-stream";
  }
  const lower = fileName.toLowerCase();
  const ext = Object.keys(MIME_BY_EXT).find((extension) => lower.endsWith(extension));
  return ext ? MIME_BY_EXT[ext] : "application/octet-stream";
}
