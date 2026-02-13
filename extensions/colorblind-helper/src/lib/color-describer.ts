import namer from "color-namer";
import { simulateColorblind, colorDistance, COLORBLIND_TYPES } from "./colorblind-sim";
import {
  rgbToHsl,
  getLightnessDescriptor,
  getBriefQualifier,
  getSimpleColorName,
} from "./hsl-utils";
import type {
  ColorDescription,
  ConfusionWarning,
  ColorblindSimulation,
  HSL,
  PickedColor,
  RGB,
} from "./types";

/** Threshold for the redmean color distance to trigger a confusion warning. */
const CONFUSION_DISTANCE_THRESHOLD = 50;

/** Convert P3 float (0-1) color components to sRGB 0-255. */
function pickedColorToRgb(color: PickedColor): RGB {
  return {
    r: Math.round(Math.max(0, Math.min(255, color.red * 255))),
    g: Math.round(Math.max(0, Math.min(255, color.green * 255))),
    b: Math.round(Math.max(0, Math.min(255, color.blue * 255))),
  };
}

/** Convert RGB to hex string. */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/** Parse a hex string to RGB. */
export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, "");
  let r: number, g: number, b: number;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/** Get the simple color name from HSL values. */
function getBasicName(hsl: HSL): string {
  return getSimpleColorName(hsl);
}

/**
 * Split a compound HTML color name like "darkslateblue" into "dark slate blue".
 * Uses a list of known color-word fragments to find word boundaries.
 */
const COLOR_WORDS = [
  "light",
  "dark",
  "medium",
  "pale",
  "deep",
  "slate",
  "steel",
  "royal",
  "navy",
  "sky",
  "powder",
  "cornflower",
  "dodger",
  "midnight",
  "sea",
  "spring",
  "forest",
  "lawn",
  "lime",
  "olive",
  "dark",
  "indian",
  "fire",
  "brick",
  "saddle",
  "sandy",
  "rosy",
  "misty",
  "ghost",
  "floral",
  "antique",
  "blanched",
  "papaya",
  "peach",
  "golden",
  "lemon",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "white",
  "black",
  "gray",
  "grey",
  "cyan",
  "magenta",
  "turquoise",
  "aqua",
  "teal",
  "coral",
  "salmon",
  "violet",
  "orchid",
  "plum",
  "lavender",
  "thistle",
  "maroon",
  "crimson",
  "tomato",
  "sienna",
  "chocolate",
  "peru",
  "tan",
  "wheat",
  "khaki",
  "beige",
  "linen",
  "ivory",
  "honeydew",
  "mint",
  "azure",
  "alice",
  "snow",
  "seashell",
  "bisque",
  "moccasin",
  "puff",
  "chiffon",
  "whip",
  "cream",
  "drab",
  "wood",
  "smoke",
  "rod",
];

function splitColorName(name: string): string {
  let remaining = name.toLowerCase();
  const parts: string[] = [];

  while (remaining.length > 0) {
    let matched = false;
    // Try longest match first
    for (let len = Math.min(remaining.length, 12); len >= 3; len--) {
      const candidate = remaining.substring(0, len);
      if (COLOR_WORDS.includes(candidate)) {
        parts.push(candidate);
        remaining = remaining.substring(len);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // No match found — take the rest as-is
      parts.push(remaining);
      break;
    }
  }

  return parts.join(" ");
}

/** Get a recognizable color name from the HTML palette. */
function getDetailedName(hex: string): string {
  const results = namer(hex, { pick: ["html"] });
  return splitColorName(results.html[0].name);
}

/** Build a brief natural-language description of a color. */
function buildDescription(hex: string, rgb: RGB): string {
  const hsl = rgbToHsl(rgb);
  const colorName = getDetailedName(hex);

  // Only use "black"/"white" for truly extreme values
  if (hsl.l <= 2 && hsl.s <= 5) return "black";
  if (hsl.l >= 98 && hsl.s <= 5) return "white";

  // Low saturation: use HTML color name with lightness qualifier
  if (hsl.s <= 10) {
    const lightDesc = getLightnessDescriptor(hsl.l);
    return `a ${lightDesc} ${colorName}`;
  }

  const qualifier = getBriefQualifier(hsl);

  return qualifier ? `a ${qualifier} ${colorName}` : `a ${colorName}`;
}

/** Generate colorblind simulations and confusion warnings. */
function getColorblindInfo(
  rgb: RGB,
  originalBasicName: string,
): { simulations: ColorblindSimulation[]; warnings: ConfusionWarning[] } {
  const simulations: ColorblindSimulation[] = [];
  const warnings: ConfusionWarning[] = [];

  for (const { type, label } of COLORBLIND_TYPES) {
    const simRgb = simulateColorblind(rgb, type);
    const simHex = rgbToHex(simRgb);
    const simHsl = rgbToHsl(simRgb);
    const simBasicName = getBasicName(simHsl);

    simulations.push({ type, label, hex: simHex, basicName: simBasicName });

    const dist = colorDistance(rgb, simRgb);
    if (dist > CONFUSION_DISTANCE_THRESHOLD && simBasicName !== originalBasicName) {
      warnings.push({
        type,
        label,
        message: `This ${originalBasicName} may appear as ${simBasicName} to people with ${label.toLowerCase()}.`,
      });
    }
  }

  return { simulations, warnings };
}

/** Describe a color picked from the screen. */
export function describePickedColor(color: PickedColor): ColorDescription {
  const rgb = pickedColorToRgb(color);
  return describeRgb(rgb);
}

/** Describe a color from RGB values. */
export function describeRgb(rgb: RGB): ColorDescription {
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const basicName = getBasicName(hsl);
  const detailedName = getDetailedName(hex);
  const detailedDescription = buildDescription(hex, rgb);
  const { simulations, warnings } = getColorblindInfo(rgb, basicName);

  return {
    hex,
    rgb,
    hsl,
    basicName,
    detailedName,
    detailedDescription,
    confusionWarnings: warnings,
    simulations,
  };
}
