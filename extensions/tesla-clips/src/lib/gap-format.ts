/**
 * Timeline gap formatting and detail markdown for merge review UI.
 */

import { getCameraDisplayName } from "../constants";
import type { CameraGroup, GapInfo, TeslaEvent } from "../types";
import { formatEventTitle } from "./format-event";

/**
 * Formats a gap duration for human-readable display.
 *
 * @param gapSeconds - Elapsed seconds between consecutive clip timestamps.
 * @returns Compact duration (seconds, minutes, or hours).
 */
export function formatGapDuration(gapSeconds: number): string {
  if (gapSeconds < 60) {
    return `${Math.round(gapSeconds)}s`;
  }

  const minutes = Math.round(gapSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Formats a clip timestamp string for gap detail lines.
 *
 * @param timestamp - Clip timestamp in `YYYY-MM-DD_HH-mm-ss` form.
 * @returns `YYYY-MM-DD HH:mm:ss` or the original string when unparsable.
 */
export function formatGapTimestamp(timestamp: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/.exec(timestamp);
  if (!match) {
    return timestamp;
  }

  const [, datePart, hour, minute, second] = match;
  return `${datePart} ${hour}:${minute}:${second}`;
}

function formatGapLine(gap: GapInfo): string {
  const duration = formatGapDuration(gap.gapSeconds);
  return `- ${formatGapTimestamp(gap.beforeTimestamp)} → ${formatGapTimestamp(gap.afterTimestamp)} (${duration} missing)`;
}

function formatCameraGaps(group: CameraGroup): string[] {
  if (group.gaps.length === 0) {
    return [];
  }

  const header = `**${getCameraDisplayName(group.camera)}** (${group.gaps.length} gap${group.gaps.length !== 1 ? "s" : ""})`;
  return [header, ...group.gaps.map(formatGapLine)];
}

/**
 * Builds markdown describing timeline gaps for an event detail view.
 *
 * @param event - Tesla event with per-camera gap metadata.
 * @returns Markdown explaining missing segments and merge impact.
 */
export function buildGapDetailMarkdown(event: TeslaEvent): string {
  const lines = [`### ${formatEventTitle(event.folderName)}`, "", "Missing clip segments (> 2 min between files):"];

  const cameraLines = event.cameras.flatMap(formatCameraGaps);
  if (cameraLines.length === 0) {
    lines.push("", "No gaps detected.");
  } else {
    lines.push("", ...cameraLines);
  }

  lines.push("", "Merged videos will jump across these gaps. Merging is still allowed.");
  return lines.join("\n");
}

/**
 * Returns the total gap count stored on the event (sum across cameras).
 *
 * @param event - Tesla event from scan.
 * @returns `event.totalGaps`.
 */
export function countEventGaps(event: TeslaEvent): number {
  return event.totalGaps;
}
