/**
 * Icon utilities for Pinwork Raycast extension.
 */

import { Icon, Color } from "@raycast/api";
import type { TaskStatus } from "../api/types";

/**
 * Returns the appropriate icon for a task status.
 */
export function getTaskStatusIcon(status: TaskStatus): Icon {
  switch (status) {
    case "active":
      return Icon.Circle;
    case "inProgress":
      return Icon.CircleProgress50;
    case "done":
      return Icon.CheckCircle;
    case "canceled":
      return Icon.XMarkCircle;
    case "somedayMaybe":
      return Icon.QuestionMarkCircle;
    case "waiting":
      return Icon.Clock;
    default:
      return Icon.Circle;
  }
}

/**
 * Returns the appropriate color for a task status.
 */
export function getTaskStatusColor(status: TaskStatus): Color {
  switch (status) {
    case "active":
      return Color.PrimaryText;
    case "inProgress":
      return Color.Blue;
    case "done":
      return Color.Green;
    case "canceled":
      return Color.SecondaryText;
    case "somedayMaybe":
      return Color.Purple;
    case "waiting":
      return Color.Orange;
    default:
      return Color.PrimaryText;
  }
}

/**
 * Returns icon for deadline urgency.
 */
export function getDeadlineIcon(isOverdue: boolean): Icon {
  return isOverdue ? Icon.ExclamationMark : Icon.Calendar;
}

/**
 * Returns color for deadline urgency.
 */
export function getDeadlineColor(isOverdue: boolean): Color {
  return isOverdue ? Color.Red : Color.SecondaryText;
}

/**
 * Returns icon for recurring tasks.
 */
export function getRecurringIcon(): Icon {
  return Icon.RotateClockwise;
}

/**
 * Returns icon for estimate.
 */
export function getEstimateIcon(): Icon {
  return Icon.Stopwatch;
}

/**
 * Returns icon for project.
 */
export function getProjectIcon(): Icon {
  return Icon.Folder;
}

/**
 * Returns icon for tag.
 */
export function getTagIcon(): Icon {
  return Icon.Tag;
}

/**
 * Returns icon for notes.
 */
export function getNotesIcon(): Icon {
  return Icon.Document;
}

/**
 * Returns icon for list type.
 */
export function getListIcon(list: string): Icon {
  switch (list.toLowerCase()) {
    case "today":
      return Icon.Sun;
    case "inbox":
      return Icon.Tray;
    case "next":
      return Icon.ArrowRight;
    case "later":
      return Icon.Calendar;
    case "someday":
      return Icon.Cloud;
    default:
      return Icon.List;
  }
}

/**
 * Parses a hex color string and returns a Raycast Color.
 * Falls back to a default color if parsing fails.
 */
export function parseProjectColor(hexColor: string | undefined): Color {
  if (!hexColor) return Color.Blue;

  const hex = hexColor.replace("#", "").trim();
  const rgb = hexToRgb(hex);
  if (!rgb) return Color.Blue;

  const palette: Array<[Color, { r: number; g: number; b: number }]> = [
    [Color.Red, { r: 255, g: 59, b: 48 }],
    [Color.Orange, { r: 255, g: 149, b: 0 }],
    [Color.Yellow, { r: 255, g: 204, b: 0 }],
    [Color.Green, { r: 52, g: 199, b: 89 }],
    [Color.Blue, { r: 0, g: 122, b: 255 }],
    [Color.Purple, { r: 175, g: 82, b: 222 }],
    [Color.SecondaryText, { r: 142, g: 142, b: 147 }],
  ];

  let best: Color = Color.Blue;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [color, swatch] of palette) {
    const distance = colorDistance(rgb, swatch);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }

  return best;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const int = parseInt(normalized, 16);
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  };
}

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}
