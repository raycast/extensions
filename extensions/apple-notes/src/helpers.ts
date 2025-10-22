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
export function stripLargeImages({ html, maxSizeMB = 5 }: { html: string; maxSizeMB?: number }): string {
  return html.replace(/<img[^>]+src="data:image\/[^"]*"[^>]*>/gi, (match) => {
    const estimatedSizeMB = (match.length * 3) / 4 / 1024 / 1024;

    if (estimatedSizeMB > maxSizeMB) {
      return `<code>[Image removed - too large (${estimatedSizeMB.toFixed(2)}MB). Open in Apple Notes to view.]</code>`;
    }

    return match;
  });
}

/**
 * Estimates the memory size of a string in MB
 */
export function estimateMemorySize(str: string): number {
  // JavaScript strings are UTF-16, so 2 bytes per character
  return (str.length * 2) / 1024 / 1024;
}

/**
 * Checks if content is safe to load in detail view
 * Returns true if content should be opened in Apple Notes instead
 */
export function isContentTooLarge(content: string, maxSizeMB = 10): boolean {
  const sizeMB = estimateMemorySize(content);
  return sizeMB > maxSizeMB;
}

/**
 * Truncates content to a maximum size while trying to keep it readable
 */
export function truncateContent(content: string, maxSizeMB = 10): string {
  if (!isContentTooLarge(content, maxSizeMB)) {
    return content;
  }

  const maxChars = Math.floor((maxSizeMB * 1024 * 1024) / 2);
  const truncated = content.substring(0, maxChars);

  return truncated + "\n\n---\n\n**[Content truncated due to size. Open in Apple Notes to view the full note.]**";
}
