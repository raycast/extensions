import { parse } from "culori";

export type ColorFormat =
  | "hex"
  | "rgb"
  | "oklch"
  | "swiftui"
  | "uicolor"
  | "unknown";

export interface ParsedColor {
  format: ColorFormat;
  r: number;
  g: number;
  b: number;
  a?: number;
}

// Regex patterns for different color formats
const HEX_PATTERN = /^#?([a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/i;
const RGB_PATTERN =
  /^rgb\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i;
const RGBA_PATTERN =
  /^rgba\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*([01](?:\.\d+)?)\s*\)$/i;
const RGB_SHORTCUT_PATTERN =
  /^(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)$/;
const OKLCH_PATTERN =
  /^oklch\(\s*([01](?:\.\d+)?)\s+([01](?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(?:\/\s*([01](?:\.\d+)?))?\s*\)$/i;
const SWIFTUI_PATTERN =
  /^Color\(red:\s*([01](?:\.\d+)?),\s*green:\s*([01](?:\.\d+)?),\s*blue:\s*([01](?:\.\d+)?)\s*(?:,\s*opacity:\s*([01](?:\.\d+)?))?\)$/i;
const UICOLOR_PATTERN =
  /^UIColor\(red:\s*([01](?:\.\d+)?),\s*green:\s*([01](?:\.\d+)?),\s*blue:\s*([01](?:\.\d+)?),\s*alpha:\s*([01](?:\.\d+)?)\)$/i;

/**
 * Detects the format of a color string
 */
export function detectColorFormat(input: string): ColorFormat {
  const trimmed = input.trim();

  if (HEX_PATTERN.test(trimmed)) {
    return "hex";
  }

  if (RGB_PATTERN.test(trimmed) || RGBA_PATTERN.test(trimmed)) {
    return "rgb";
  }

  if (RGB_SHORTCUT_PATTERN.test(trimmed)) {
    return "rgb";
  }

  if (OKLCH_PATTERN.test(trimmed)) {
    return "oklch";
  }

  if (SWIFTUI_PATTERN.test(trimmed)) {
    return "swiftui";
  }

  if (UICOLOR_PATTERN.test(trimmed)) {
    return "uicolor";
  }

  return "unknown";
}

/**
 * Parses a hex color string to RGB values
 */
function parseHex(hex: string): ParsedColor | null {
  const match = hex.match(HEX_PATTERN);
  if (!match) return null;

  let hexValue = match[1];

  // Convert 3-char hex to 6-char
  if (hexValue.length === 3) {
    hexValue = hexValue
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = parseInt(hexValue.slice(0, 2), 16);
  const g = parseInt(hexValue.slice(2, 4), 16);
  const b = parseInt(hexValue.slice(4, 6), 16);

  let a: number | undefined;
  if (hexValue.length === 8) {
    a = parseInt(hexValue.slice(6, 8), 16) / 255;
  }

  return { format: "hex", r, g, b, a };
}

/**
 * Parses an RGB/RGBA color string or RGB shortcut
 */
function parseRGB(rgb: string): ParsedColor | null {
  let match = rgb.match(RGBA_PATTERN);
  if (match) {
    const r = parseFloat(match[1]);
    const g = parseFloat(match[2]);
    const b = parseFloat(match[3]);
    const a = parseFloat(match[4]);
    return { format: "rgb", r, g, b, a };
  }

  match = rgb.match(RGB_PATTERN);
  if (match) {
    const r = parseFloat(match[1]);
    const g = parseFloat(match[2]);
    const b = parseFloat(match[3]);
    return { format: "rgb", r, g, b };
  }

  // Try RGB shortcut pattern (e.g., "123, 234, 345" or "123 234 345")
  match = rgb.match(RGB_SHORTCUT_PATTERN);
  if (match) {
    const r = Math.min(255, Math.max(0, parseFloat(match[1])));
    const g = Math.min(255, Math.max(0, parseFloat(match[2])));
    const b = Math.min(255, Math.max(0, parseFloat(match[3])));
    return { format: "rgb", r, g, b };
  }

  return null;
}

/**
 * Parses an OKLCH color string using culori
 */
function parseOKLCH(oklch: string): ParsedColor | null {
  try {
    const parsed = parse(oklch);
    if (!parsed) return null;

    // Convert to RGB values - culori should handle this automatically
    const r = Math.round((parsed.r || 0) * 255);
    const g = Math.round((parsed.g || 0) * 255);
    const b = Math.round((parsed.b || 0) * 255);
    const a = parsed.alpha;

    return { format: "oklch", r, g, b, a };
  } catch {
    return null;
  }
}

/**
 * Parses a SwiftUI Color declaration
 */
function parseSwiftUI(swiftui: string): ParsedColor | null {
  const match = swiftui.match(SWIFTUI_PATTERN);
  if (!match) return null;

  const r = Math.round(parseFloat(match[1]) * 255);
  const g = Math.round(parseFloat(match[2]) * 255);
  const b = Math.round(parseFloat(match[3]) * 255);
  const a = match[4] ? parseFloat(match[4]) : undefined;

  return { format: "swiftui", r, g, b, a };
}

/**
 * Parses a UIColor declaration
 */
function parseUIColor(uicolor: string): ParsedColor | null {
  const match = uicolor.match(UICOLOR_PATTERN);
  if (!match) return null;

  const r = Math.round(parseFloat(match[1]) * 255);
  const g = Math.round(parseFloat(match[2]) * 255);
  const b = Math.round(parseFloat(match[3]) * 255);
  const a = parseFloat(match[4]);

  return { format: "uicolor", r, g, b, a };
}

/**
 * Parses any supported color format and returns normalized RGB values
 */
export function parseColor(input: string): ParsedColor | null {
  const trimmed = input.trim();
  const format = detectColorFormat(trimmed);

  switch (format) {
    case "hex":
      return parseHex(trimmed);
    case "rgb":
      return parseRGB(trimmed);
    case "oklch":
      return parseOKLCH(trimmed);
    case "swiftui":
      return parseSwiftUI(trimmed);
    case "uicolor":
      return parseUIColor(trimmed);
    default:
      return null;
  }
}
