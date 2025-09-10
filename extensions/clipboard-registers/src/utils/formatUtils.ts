import { Icon, Color } from "@raycast/api";
import { ContentType } from "./types";
import { CONTENT_TYPES } from "./constants";

/**
 * Time constants for relative time formatting
 */
const TIME_CONSTANTS = {
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
  WEEK: 1000 * 60 * 60 * 24 * 7,
} as const;

/**
 * Formats a timestamp into a human-readable relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string (e.g., "2 minutes ago", "Just now")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / TIME_CONSTANTS.MINUTE);
  const hours = Math.floor(diff / TIME_CONSTANTS.HOUR);
  const days = Math.floor(diff / TIME_CONSTANTS.DAY);

  if (minutes < 1) {
    return "Just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else {
    // For older content, show the actual date
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Gets the appropriate Raycast icon and color for a content type
 * @param contentType - The type of content (text, file, html, or null for empty)
 * @returns Object containing the icon source and tint color
 */
export function getContentTypeIcon(contentType: ContentType | null): { source: Icon; tintColor: Color } {
  switch (contentType) {
    case CONTENT_TYPES.TEXT:
      return { source: Icon.Text, tintColor: Color.Blue };
    case CONTENT_TYPES.FILE:
      return { source: Icon.Document, tintColor: Color.Orange };
    case CONTENT_TYPES.HTML:
      return { source: Icon.Globe, tintColor: Color.Green };
    case null:
    default:
      return { source: Icon.Circle, tintColor: Color.Red };
  }
}

/**
 * Generates a display-friendly preview string for register content
 * @param contentType - The type of content
 * @param textPreview - Preview text for text/html content
 * @param originalFileName - Original filename for file content
 * @param filePaths - Array of file paths for file content
 * @returns User-friendly preview string
 */
export function getContentPreview(
  contentType: ContentType | null,
  textPreview?: string,
  originalFileName?: string,
  filePaths?: string[],
): string {
  if (!contentType) {
    return "Empty register";
  }

  switch (contentType) {
    case CONTENT_TYPES.TEXT:
    case CONTENT_TYPES.HTML:
      return textPreview || "No preview available";

    case CONTENT_TYPES.FILE:
      if (originalFileName) {
        return originalFileName;
      } else if (filePaths && filePaths.length > 0) {
        const fileName = filePaths[0].split("/").pop() || "Unknown file";
        return filePaths.length > 1 ? `${fileName} (+${filePaths.length - 1} more)` : fileName;
      }
      return "File content";

    default:
      return "Unknown content";
  }
}
