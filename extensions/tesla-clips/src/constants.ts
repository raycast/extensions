/**
 * Shared constants for Tesla clip parsing, UI theming, and camera labels.
 *
 * @module constants
 */

import { Color } from "@raycast/api";

/** Raycast list/detail tint colors used across Tesla Clips views. */
export const MODERN_COLORS = {
  primary: Color.Blue,
  success: Color.Green,
  warning: Color.Yellow,
  error: Color.Red,
  neutral: Color.SecondaryText,
} as const;

/** Expected seconds between consecutive Tesla segment filenames. */
export const TESLA_SEGMENT_INTERVAL_SECONDS = 60;

/** Regex matching Tesla clip filenames: `YYYY-MM-DD_HH-MM-SS-camera.mp4`. */
export const CLIP_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})-(.+)\.mp4$/i;

/** Human-readable labels for known Tesla camera identifiers. */
export const CAMERA_DISPLAY_NAMES: Record<string, string> = {
  front: "Front",
  back: "Back",
  left_repeater: "Left Repeater",
  right_repeater: "Right Repeater",
  narrow_front: "Narrow Front",
  left_pillar: "Left Pillar",
  right_pillar: "Right Pillar",
};

/**
 * Resolves a user-facing camera label from a raw Tesla camera id.
 *
 * @param camera - Raw camera folder or filename segment (e.g. `left_repeater`).
 * @returns Display name from {@link CAMERA_DISPLAY_NAMES}, or a title-cased fallback.
 */
export function getCameraDisplayName(camera: string): string {
  return CAMERA_DISPLAY_NAMES[camera] ?? camera.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
