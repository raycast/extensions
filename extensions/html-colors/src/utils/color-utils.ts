import { Icon } from "@raycast/api";
import { ColorWithCategories } from "../types";
import { ColorResult } from "./search-utils";
import { ShadeCategory } from "../constants";

/**
 * SVG dimensions for color preview
 */
const SVG_WIDTH = 200;
const SVG_HEIGHT = 150;
const BORDER_RADIUS = 8;

const EMPTY_GROUPS: Record<ShadeCategory, ColorResult[]> = Object.freeze({
  pink: [],
  red: [],
  orange: [],
  yellow: [],
  brown: [],
  "purple, violet and magenta": [],
  blue: [],
  cyan: [],
  green: [],
  white: [],
  "black and gray": [],
});

/**
 * Generates an SVG preview of a color as a rounded rectangle with a border
 */
export function generateColorPreviewSvg(hexColor: string, colorName: string): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${hexColor}" rx="${BORDER_RADIUS}" ry="${BORDER_RADIUS}"/>
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="none" stroke="#ccc" stroke-width="1" rx="${BORDER_RADIUS}" ry="${BORDER_RADIUS}"/>
</svg>`;

  const base64Svg = Buffer.from(svg).toString("base64");
  return `![${colorName} Color Preview](data:image/svg+xml;base64,${base64Svg})`;
}

/**
 * Creates icon objects for color categories, using different icons for basic and extended colors.
 * Categories are sorted to ensure basic colors appear before extended ones
 */
export function getCategoryIcons(categories: ColorWithCategories["categories"]) {
  const sortedCategories = [...categories].sort((a) => {
    return a === "basic" ? -1 : 1;
  });
  return sortedCategories.map((category) => ({
    icon: category === "basic" ? Icon.Circle : Icon.CircleEllipsis,
    tooltip: `${category.charAt(0).toUpperCase()}${category.slice(1)} Color`,
  }));
}

/**
 * Group colors by their shade categories
 */
export function groupColorsByShade(colors: ColorResult[]): Record<ShadeCategory, ColorResult[]> {
  return colors.reduce(
    (groups, color) => ({
      ...groups,
      [color.shade]: [...groups[color.shade], color],
    }),
    { ...EMPTY_GROUPS },
  );
}
