import lookup from "friendly-mimes";

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "Unknown";
  if (bytes === 0) return "Zero KB";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${dateStr} at ${timeStr}`;
  }
}

/**
 * Format file type for display (converts MIME type to friendly name)
 */
export function formatFileType(mimeType?: string): string {
  if (!mimeType) return "File";

  try {
    const result = lookup.resolveMime(mimeType);
    return result?.name || mimeType;
  } catch {
    return mimeType;
  }
}
