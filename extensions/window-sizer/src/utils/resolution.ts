import { Resolution } from "../types";

/**
 * Compares two resolutions to check if they have the same dimensions
 * @param r1 First resolution
 * @param r2 Second resolution
 * @returns true if both resolutions have the same width and height
 */
export function isSameResolution(r1: Resolution, r2: Resolution): boolean {
  return r1.width === r2.width && r1.height === r2.height;
}

/**
 * Generates a unique ID for a resolution item in the list
 * @param resolution - The resolution object
 * @param type - The type of resolution ("custom" or "default")
 * @param section - The section name where the resolution appears
 * @param index - The index of the item in its section
 * @returns A unique string ID for the resolution item
 */
export const generateResolutionItemId = (
  resolution: Resolution,
  type: "custom" | "default",
  section: string,
  index: number,
): string => {
  return `${type}-${resolution.width}x${resolution.height}-${section}-${index}`;
};
