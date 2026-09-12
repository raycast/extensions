/**
 * https://github.com/badges/shields/blob/master/badge-maker/lib/color.js
 * CC0-1.0 license
 */
// @ts-expect-error: No types available
import { fromString } from "css-color-converter";

const namedColors = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellow: "#dfb317",
  yellowgreen: "#a4a61d",
  orange: "#fe7d37",
  red: "#e05d44",
  blue: "#007ec6",
  grey: "#555",
  lightgrey: "#9f9f9f",
};

const aliases = {
  gray: "grey",
  lightgray: "lightgrey",
  critical: "red",
  important: "orange",
  success: "brightgreen",
  informational: "blue",
  inactive: "lightgrey",
};

const resolvedAliases = {};
Object.entries(aliases).forEach(([alias, original]) => {
  // @ts-expect-error: No types available
  resolvedAliases[alias] = namedColors[original];
});

function brightness(color: string) {
  if (color) {
    const cssColor = fromString(color);
    if (cssColor) {
      const rgb = cssColor.toRgbaArray();
      return +((rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 255000).toFixed(2);
    }
  }
  return 0;
}

/**
 * https://github.com/badges/shields/blob/master/badge-maker/lib/badge-renderers.js
 * @param {string} color
 * @returns {string}
 */
export function colorsForBackground(color: string) {
  const brightnessThreshold = 0.69;
  if (brightness(color) <= brightnessThreshold) {
    return "fff";
  } else {
    return "333";
  }
}
