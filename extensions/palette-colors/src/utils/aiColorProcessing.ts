import { ColorItem } from "../types";
import { isValidHexColor } from "./isValidHexColor";

/**
 * Safely parses AI-generated color JSON with validation.
 */
export function parseAIColors(jsonColors: string): string[] {
  if (!jsonColors) return [];

  try {
    const parsed = JSON.parse(jsonColors);

    // Validate that the parsed data is an array
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter for valid hex colors only
    return parsed.filter(isValidHexColor);
  } catch {
    return [];
  }
}

/**
 * Converts color strings to ColorItem objects with unique IDs.
 */
export function createColorItems(colors: string[]): ColorItem[] {
  return colors.map((color, index) => ({
    id: index.toString(),
    color,
  }));
}
