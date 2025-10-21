import os from "os";

export const fileIcon = "/System/Applications/Notes.app";

export function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "…";
}

export function getOpenNoteURL(uuid: string) {
  const isSonomaOrLater = parseInt(os.release().split(".")[0]) >= 23;
  return `${isSonomaOrLater ? "applenotes" : "notes"}://showNote?identifier=${uuid}`;
}

/**
 * Strips large base64 data URLs from HTML to prevent memory issues
 * Replaces them with a placeholder text
 */
export function stripLargeImages(html: string, maxSizeKB = 500): string {
  return html.replace(/<img[^>]+src="data:image\/[^"]*"[^>]*>/gi, (match) => {
    const estimatedSizeKB = (match.length * 3) / 4 / 1024;

    if (estimatedSizeKB > maxSizeKB) {
      const estimatedSizeMB = (estimatedSizeKB / 1024).toFixed(2);
      return `<code>[Image removed - too large (${estimatedSizeMB}MB). Open in Apple Notes to view.]</code>`;
    }

    return match;
  });
}
