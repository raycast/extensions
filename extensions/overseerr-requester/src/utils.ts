import { MediaResult, MediaType, MediaInfo, MEDIA_TYPE_MAP } from "./types";

/**
 * Returns badge information based on media status code
 * @param status - Numeric status code of the media
 * @returns Object containing badge text, color, and icon
 */
export const getMediaStatusBadge = (status?: number) => {
  switch (status) {
    case 1:
      return { text: "UNKNOWN", color: "secondary", icon: "❓" };
    case 2:
      return { text: "REQUESTED", color: "yellow", icon: "📝" };
    case 3:
      return { text: "PENDING", color: "yellow", icon: "⏳" };
    case 4:
      return { text: "PARTIALLY AVAILABLE", color: "orange", icon: "⚡" };
    case 5:
      return { text: "AVAILABLE", color: "green", icon: "✅" };
    default:
      return { text: "NOT REQUESTED", color: "red", icon: "" };
  }
};

/**
 * Gets media type information including icon and label
 * @param mediaType - String representing the type of media
 * @returns Object containing icon and label for the media type
 */
export const getMediaTypeInfo = (mediaType: string) => {
  const type = mediaType?.toLowerCase() as MediaType;
  return MEDIA_TYPE_MAP[type] || { icon: "📌", label: mediaType || "Unknown" };
};

/**
 * Checks if media has already been requested or is available
 * @param mediaInfo - Media information object containing status
 * @returns Boolean indicating if media is requested/available
 */
export const isMediaRequested = (mediaInfo?: MediaInfo) => {
  if (!mediaInfo) return false;
  return [2, 3, 4, 5].includes(mediaInfo.status);
};

/**
 * Determines if media can be requested based on type and current status
 * @param media - Media result object
 * @returns Boolean indicating if media is requestable
 */
export const isRequestable = (media: MediaResult) => {
  return media.mediaType !== "person" && !isMediaRequested(media.mediaInfo);
};

/**
 * Normalizes API URL by removing trailing slashes and ensuring /api/v1 is present
 * @param url - Base API URL string
 * @returns Normalized API URL string
 */
export const normalizeApiUrl = (url: string): string => {
  const cleanUrl = url.replace(/\/$/, "");
  return cleanUrl.includes("/api/v1") ? cleanUrl : `${cleanUrl}/api/v1`;
};

/**
 * Formats byte values into human-readable sizes with appropriate units
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate size unit
 */
export const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * Returns a formatted display string for media type with appropriate icon
 * @param mediaType - String representing the type of media
 * @returns Formatted string with icon and media type label
 */
export const getMediaTypeDisplay = (mediaType?: string): string => {
  switch (mediaType?.toLowerCase()) {
    case "movie":
      return "🎬 Movie";
    case "tv":
      return "📺 TV Show";
    case "person":
      return "👤 Person";
    default:
      return mediaType ? `📌 ${mediaType}` : "Unknown";
  }
};
