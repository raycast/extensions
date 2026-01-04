/**
 * Configuration constants for SVG and UI
 */

// SVG generation constants
export const SVG_CONFIG = {
  fontSize: 14,
  fontSizeLarge: 32,
  lineHeight: 1.5,
  padding: 16,
  textColor: "#ffffff",
  charWidthHalf: 8.4,
  charWidthLarge: 20,
  outputSize: 200,
  fontFamily: "Menlo, Monaco, Consolas, monospace",
} as const;

// UI constants
export const UI_CONFIG = {
  defaultGridColumns: 5,
  minGridColumns: 3,
  maxGridColumns: 8,
  hudTextMaxLength: 20,
  hudUnicodeMaxLength: 30,
} as const;

// External URLs
export const URLS = {
  submitArt: "https://github.com/SphereStacking/MojiArt/issues/new/choose",
} as const;
