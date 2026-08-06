/**
 * Event folder naming, list formatting, and camera merge status labels.
 */

import { Icon } from "@raycast/api";
import { getCameraDisplayName } from "../constants";
import type { CameraGroup, CameraMergeResult, CameraMergeStatus, TeslaEvent } from "../types";

const EVENT_FOLDER_PATTERN = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/;

/**
 * Parses a Tesla event folder name into a local `Date`.
 *
 * @param folderName - Folder basename in `YYYY-MM-DD_HH-mm-ss` form.
 * @returns Parsed date or `null` when the name does not match.
 */
export function parseEventFolderDate(folderName: string): Date | null {
  const match = EVENT_FOLDER_PATTERN.exec(folderName);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  if (!year || !month || !day || !hour || !minute || !second) {
    return null;
  }

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);
  const secondNum = parseInt(second, 10);

  const date = new Date(yearNum, monthNum - 1, dayNum, hourNum, minuteNum, secondNum);

  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum ||
    date.getHours() !== hourNum ||
    date.getMinutes() !== minuteNum ||
    date.getSeconds() !== secondNum
  ) {
    return null;
  }

  return date;
}

/**
 * Formats an event folder name for list titles (date and time separated by a middle dot).
 *
 * @param folderName - Event folder basename.
 * @returns Localized title or the raw folder name when unparsable.
 */
export function formatEventTitle(folderName: string): string {
  const date = parseEventFolderDate(folderName);
  if (!date) {
    return folderName;
  }

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${datePart} · ${timePart}`;
}

/**
 * Compact date for narrow list rows (for example `Sep 9, 2024`).
 *
 * @param folderName - Event folder basename.
 * @returns Short date string or the raw folder name when unparsable.
 */
export function formatEventListDate(folderName: string): string {
  const date = parseEventFolderDate(folderName);
  if (!date) {
    return folderName;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Formats only the time portion of an event folder name.
 *
 * @param folderName - Event folder basename.
 * @returns Localized time or the raw folder name when unparsable.
 */
export function formatEventTimeOnly(folderName: string): string {
  const date = parseEventFolderDate(folderName);
  if (!date) {
    return folderName;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Pluralizes clip segment count for subtitles.
 *
 * @param segments - Number of source clip files.
 * @returns Human-readable count (for example `3 clips`).
 */
export function formatEventClipCount(segments: number): string {
  return `${segments} clip${segments !== 1 ? "s" : ""}`;
}

/**
 * Builds Raycast list search keywords for an event.
 *
 * @param event - Scanned Tesla event.
 * @returns Folder name plus each camera id.
 */
export function formatEventSearchKeywords(event: TeslaEvent): string[] {
  return [event.folderName, ...event.cameras.map((group) => group.camera)];
}

/**
 * Summarizes cameras for compact list accessories (first word of display name).
 *
 * @param cameras - Camera groups on the event.
 * @returns Middle-dot-separated short names.
 */
export function formatCameraSummary(cameras: readonly CameraGroup[]): string {
  return cameras
    .map((group) => {
      const name = getCameraDisplayName(group.camera);
      return name.split(" ")[0] ?? name;
    })
    .join(" · ");
}

/**
 * Rough duration estimate from segment count (one minute per gap between segments).
 *
 * @param segments - Total clip segments across cameras or per camera.
 * @returns Estimated minutes (minimum 0).
 */
export function estimateEventDurationMinutes(segments: number): number {
  return Math.max(segments - 1, 0);
}

/**
 * Maps a per-camera merge result status to a short UI label.
 *
 * @param status - Merge outcome for one camera.
 * @returns Display label for list accessories.
 */
export function formatMergeStatus(status: CameraMergeStatus): string {
  switch (status) {
    case "merged":
      return "Merged";
    case "skipped-single":
      return "Single clip";
    case "skipped-existing":
      return "Already merged";
    case "failed":
      return "Failed";
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled CameraMergeStatus: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Returns a directional Raycast icon for known Tesla camera ids.
 *
 * @param camera - Tesla camera id.
 * @returns Arrow icon for known cameras, {@link Icon.Video} otherwise.
 */
export function getCameraIcon(camera: string): Icon {
  switch (camera) {
    case "front":
    case "narrow_front":
      return Icon.ArrowUp;
    case "back":
      return Icon.ArrowDown;
    case "left_repeater":
    case "left_pillar":
      return Icon.ArrowLeft;
    case "right_repeater":
    case "right_pillar":
      return Icon.ArrowRight;
    default:
      return Icon.Video;
  }
}

/**
 * Looks up merge output for a camera on a completed event merge.
 *
 * @param camera - Camera id to find.
 * @param outputs - Per-camera merge results, if any.
 * @returns Matching result or `undefined`.
 */
export function findCameraMergeResult(
  camera: string,
  outputs: readonly CameraMergeResult[] | undefined,
): CameraMergeResult | undefined {
  return outputs?.find((output) => output.camera === camera);
}
