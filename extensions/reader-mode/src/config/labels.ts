/**
 * Human-readable labels for various constants used in the UI
 */

/**
 * Labels for archive/bypass sources displayed in toasts and UI
 */
export const ARCHIVE_SOURCE_LABELS: Record<string, string> = {
  googlebot: "Googlebot bypass",
  bingbot: "Bingbot bypass",
  "social-referrer": "Social media referrer",
  wallhopper: "WallHopper",
  "archive.is": "archive.is",
  wayback: "Wayback Machine",
  browser: "browser tab",
};

/**
 * Get a human-readable label for an archive source
 */
export function getArchiveSourceLabel(source: string): string {
  return ARCHIVE_SOURCE_LABELS[source] || source;
}
