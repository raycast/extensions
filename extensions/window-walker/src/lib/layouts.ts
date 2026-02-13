import { LayoutPreset } from "./types";

/**
 * Predefined window layout presets.
 */
export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: "Left Half",
    icon: "⬅️",
    description: "Snap window to left half of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy,
      width: Math.floor(sw / 2),
      height: sh,
    }),
  },
  {
    name: "Right Half",
    icon: "➡️",
    description: "Snap window to right half of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx + Math.floor(sw / 2),
      y: sy,
      width: Math.floor(sw / 2),
      height: sh,
    }),
  },
  {
    name: "Top Half",
    icon: "⬆️",
    description: "Snap window to top half of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy,
      width: sw,
      height: Math.floor(sh / 2),
    }),
  },
  {
    name: "Bottom Half",
    icon: "⬇️",
    description: "Snap window to bottom half of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy + Math.floor(sh / 2),
      width: sw,
      height: Math.floor(sh / 2),
    }),
  },
  {
    name: "Top Left",
    icon: "↖️",
    description: "Snap window to top-left quadrant",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy,
      width: Math.floor(sw / 2),
      height: Math.floor(sh / 2),
    }),
  },
  {
    name: "Top Right",
    icon: "↗️",
    description: "Snap window to top-right quadrant",
    apply: (sw, sh, sx, sy) => ({
      x: sx + Math.floor(sw / 2),
      y: sy,
      width: Math.floor(sw / 2),
      height: Math.floor(sh / 2),
    }),
  },
  {
    name: "Bottom Left",
    icon: "↙️",
    description: "Snap window to bottom-left quadrant",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy + Math.floor(sh / 2),
      width: Math.floor(sw / 2),
      height: Math.floor(sh / 2),
    }),
  },
  {
    name: "Bottom Right",
    icon: "↘️",
    description: "Snap window to bottom-right quadrant",
    apply: (sw, sh, sx, sy) => ({
      x: sx + Math.floor(sw / 2),
      y: sy + Math.floor(sh / 2),
      width: Math.floor(sw / 2),
      height: Math.floor(sh / 2),
    }),
  },
  {
    name: "Center",
    icon: "🎯",
    description: "Center window (60% width, 80% height)",
    apply: (sw, sh, sx, sy) => {
      const width = Math.floor(sw * 0.6);
      const height = Math.floor(sh * 0.8);
      return {
        x: sx + Math.floor((sw - width) / 2),
        y: sy + Math.floor((sh - height) / 2),
        width,
        height,
      };
    },
  },
  {
    name: "Maximize",
    icon: "⬜",
    description: "Maximize window to fill screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy,
      width: sw,
      height: sh,
    }),
  },
  {
    name: "Left Third",
    icon: "◀️",
    description: "Snap window to left third of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy,
      width: Math.floor(sw / 3),
      height: sh,
    }),
  },
  {
    name: "Center Third",
    icon: "⏺️",
    description: "Snap window to center third of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx + Math.floor(sw / 3),
      y: sy,
      width: Math.floor(sw / 3),
      height: sh,
    }),
  },
  {
    name: "Right Third",
    icon: "▶️",
    description: "Snap window to right third of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx + Math.floor((sw * 2) / 3),
      y: sy,
      width: Math.floor(sw / 3),
      height: sh,
    }),
  },
  {
    name: "Left Two-Thirds",
    icon: "◀️◀️",
    description: "Snap window to left two-thirds of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx,
      y: sy,
      width: Math.floor((sw * 2) / 3),
      height: sh,
    }),
  },
  {
    name: "Right Two-Thirds",
    icon: "▶️▶️",
    description: "Snap window to right two-thirds of screen",
    apply: (sw, sh, sx, sy) => ({
      x: sx + Math.floor(sw / 3),
      y: sy,
      width: Math.floor((sw * 2) / 3),
      height: sh,
    }),
  },
];
