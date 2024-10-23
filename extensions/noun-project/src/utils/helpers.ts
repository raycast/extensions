import { Color } from "@raycast/api";

import fs from "fs";
import os from "os";
import path from "path";

// Utility function to convert base64 to a temporary file
export async function base64ToFile(base64: string, fileName: string): Promise<string> {
  const filePath = path.join(os.tmpdir(), fileName);

  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Decodes a base64 encoded SVG string, escapes special characters for use in template literals,
 * and removes the XML declaration and outer <svg> tags.
 *
 * @param base64String - The base64 encoded SVG string.
 * @returns The cleaned SVG content.
 */
export function processSVGContent(base64String: string): string {
  // Decode base64 to SVG string
  const decodedSVG = atob(base64String);

  // Escape backticks and dollar signs for use in template literals
  const escapedSVG = decodedSVG.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  // Extract the SVG content without the outer <svg> tags to use in JSX
  const svgContent = escapedSVG
    .replace(/<\?xml[^>]*\?>/, "") // Remove XML declaration
    .replace(/<svg[^>]*>/, "") // Remove opening <svg> tag
    .replace("</svg>", ""); // Remove closing </svg> tag

  return svgContent;
}

export function getUsageColor(usage: number, limit: number): string {
  if (usage >= limit) {
    return Color.Red;
  } else if (usage >= limit * 0.75) {
    return Color.Orange;
  } else if (usage >= limit * 0.5) {
    return Color.Yellow;
  } else if (usage >= limit * 0.25) {
    return Color.Blue;
  } else {
    return Color.Green;
  }
}

export function normalizeHexCode(hex: string): string | false {
  // Remove '#' if present
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
  }

  // Check if the hex code is valid
  const hexColorRegex = /^([0-9A-F]{3}|[0-9A-F]{6})$/i;
  if (hexColorRegex.test(hex)) {
    return hex.toUpperCase(); // Return the normalized hex code in uppercase
  } else {
    return false;
  }
}
