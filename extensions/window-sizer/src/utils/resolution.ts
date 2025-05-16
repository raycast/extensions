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
