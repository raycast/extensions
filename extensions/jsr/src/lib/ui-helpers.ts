import { formatDistanceToNow } from "date-fns";

import { Color } from "@raycast/api";

/**
 * Format an ISO timestamp as a human-friendly relative string (e.g. "9 months ago").
 * Returns "unknown" if the input is null/undefined.
 */
export const formatRelative = (iso: string | null | undefined): string =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "unknown";

/**
 * Map a 0-100 JSR score to its threshold color: green ≥80, yellow ≥50, red otherwise.
 */
export const scoreColor = (score: number): Color =>
  score >= 80 ? Color.Green : score >= 50 ? Color.Yellow : Color.Red;

/**
 * Format a byte count as a human-readable size (B, KB, MB, GB).
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};
