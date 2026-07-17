import { Icon } from "@raycast/api";
import { getPreferences } from "./types";
import type { RazunaFile } from "./types";

/**
 * Get the appropriate icon for a file based on its extension
 */
export function getFileIcon(extension: string): Icon {
  const ext = extension.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
    return Icon.Image;
  }
  if (["pdf"].includes(ext)) {
    return Icon.Document;
  }
  if (["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(ext)) {
    return Icon.Video;
  }
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) {
    return Icon.Music;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return Icon.Box;
  }
  if (["txt", "md", "log"].includes(ext)) {
    return Icon.Text;
  }

  return Icon.Document;
}

/**
 * Build the file view URL using the file's short_id
 */
export function getFileViewUrl(file: RazunaFile): string | null {
  if (!file.short_id) return null;
  const { server_url } = getPreferences();
  const baseUrl = server_url.startsWith("http") ? server_url : `https://${server_url}`;
  return `${baseUrl}/files/go/${file.short_id}`;
}
