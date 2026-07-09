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
 * @param type - The type of resolution ("custom" or "preset")
 * @param section - The section name where the resolution appears
 * @param index - The index of the item in its section
 * @returns A unique string ID for the resolution item
 */
export function generateResolutionItemId(
  resolution: Resolution,
  type: "custom" | "preset",
  section: string,
  index: number,
): string {
  return `${type}-${resolution.width}x${resolution.height}-${section}-${index}`;
}

export function formatResolutionAspectRatio(resolution: Resolution): string | undefined {
  const divisor = getGreatestCommonDivisor(resolution.width, resolution.height);
  const ratioWidth = resolution.width / divisor;
  const ratioHeight = resolution.height / divisor;

  if (ratioWidth === resolution.width && ratioHeight === resolution.height) {
    return undefined;
  }

  return `${ratioWidth}:${ratioHeight}`;
}

function getGreatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x;
}
