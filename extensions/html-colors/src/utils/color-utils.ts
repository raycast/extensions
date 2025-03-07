import { Icon } from "@raycast/api";
import { ColorWithCategories } from "../types";

/**
 * Generates an SVG preview of a color as a rounded rectangle with a border
 */
export function generateColorPreviewSvg(hexColor: string, colorName: string): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="150" fill="${hexColor}" rx="8" ry="8"/>
  <rect width="200" height="150" fill="none" stroke="#ccc" stroke-width="1" rx="8" ry="8"/>
</svg>`;

  const base64Svg = Buffer.from(svg).toString("base64");
  return `![${colorName} Color Preview](data:image/svg+xml;base64,${base64Svg})`;
}

/**
 * Creates icon objects for color categories, using different icons for basic and extended colors.
 * Categories are sorted to ensure basic colors appear before extended ones
 */
export function getCategoryIcons(categories: ColorWithCategories["categories"]) {
  const sortedCategories = [...categories].sort((a) => (a === "basic" ? -1 : 1));
  return sortedCategories.map((category) => ({
    icon: category === "basic" ? Icon.Circle : Icon.CircleEllipsis,
    tooltip: `${category.charAt(0).toUpperCase()}${category.slice(1)} Color`,
  }));
}
