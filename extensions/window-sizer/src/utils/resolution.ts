import type { Resolution } from "../types";

interface AspectRatio {
  width: bigint;
  height: bigint;
}

/**
 * Compares two resolutions to check if they have the same dimensions
 * @param r1 First resolution
 * @param r2 Second resolution
 * @returns true if both resolutions have the same width and height
 */
export function isSameResolution(r1: Resolution, r2: Resolution): boolean {
  return r1.width === r2.width && r1.height === r2.height;
}

export function normalizeResolutionSearchText(searchText: string): string {
  return searchText.replaceAll("：", ":");
}

export function getResolutionSearchKeywords(resolution: Resolution, searchText: string): string[] {
  const normalizedSearchText = normalizeResolutionSearchText(searchText).trim();
  if (!normalizedSearchText.toLowerCase().startsWith("r")) {
    return [];
  }

  const aspectRatio = formatAspectRatio(resolution);
  if (!aspectRatio) {
    return [];
  }

  const prefixedAspectRatio = `r${aspectRatio}`;
  const searchedAspectRatio = parseAspectRatio(normalizedSearchText);
  if (!searchedAspectRatio || !matchesAspectRatio(resolution, searchedAspectRatio)) {
    return [prefixedAspectRatio];
  }

  return normalizedSearchText.toLowerCase() === prefixedAspectRatio
    ? [prefixedAspectRatio]
    : [prefixedAspectRatio, normalizedSearchText];
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

function formatAspectRatio(resolution: Resolution): string | undefined {
  if (!isValidDimension(resolution.width) || !isValidDimension(resolution.height)) {
    return undefined;
  }

  const divisor = greatestCommonDivisor(resolution.width, resolution.height);
  return `${resolution.width / divisor}:${resolution.height / divisor}`;
}

function parseAspectRatio(searchText: string): AspectRatio | undefined {
  const match = /^r\s*(\d+)\s*[:*]\s*(\d+)$/i.exec(searchText);
  if (!match) {
    return undefined;
  }

  const width = BigInt(match[1]);
  const height = BigInt(match[2]);
  return width > 0n && height > 0n ? { width, height } : undefined;
}

function matchesAspectRatio(resolution: Resolution, aspectRatio: AspectRatio): boolean {
  if (!isValidDimension(resolution.width) || !isValidDimension(resolution.height)) {
    return false;
  }

  return BigInt(resolution.width) * aspectRatio.height === BigInt(resolution.height) * aspectRatio.width;
}

function isValidDimension(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function greatestCommonDivisor(first: number, second: number): number {
  let left = first;
  let right = second;

  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }

  return left;
}
