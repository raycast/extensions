import { environment } from "@raycast/api";
import { findGreffeInCompressedData, type CompactGreffeData } from "./greffe-compressor";

// Import compressed data (84% smaller than original)
import greffeCompressedData from "../../assets/greffes-index-compressed.json";

// Fallback to old format if compressed data not available
let greffeIndexData: GreffeIndex | null = null;
try {
  // Note: Using require for dynamic JSON import fallback
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  greffeIndexData = require("../../assets/greffes-index.json");
} catch {
  // Old format not available - compressed-only mode
}

interface GreffeIndex {
  [codePostal: string]: string;
}

// Type guards
function isNestedGreffeData(data: unknown): data is { byCodePostal: GreffeIndex } {
  return typeof data === "object" && data !== null && "byCodePostal" in data;
}

function isCompressedGreffeData(data: unknown): data is CompactGreffeData {
  return typeof data === "object" && data !== null && "ranges" in data && "singles" in data;
}

// Initialize data source
const useCompressedFormat = isCompressedGreffeData(greffeCompressedData);
let legacyGreffeIndex: GreffeIndex | null = null;

if (!useCompressedFormat && greffeIndexData) {
  // Fallback to legacy format
  legacyGreffeIndex = isNestedGreffeData(greffeIndexData)
    ? greffeIndexData.byCodePostal
    : (greffeIndexData as GreffeIndex);
}

if (environment.isDevelopment) {
  const format = useCompressedFormat ? "compressed" : "legacy";
  const size = useCompressedFormat
    ? `${(greffeCompressedData as CompactGreffeData).metadata.compressedSize} entries`
    : `${legacyGreffeIndex ? Object.keys(legacyGreffeIndex).length : 0} entries`;
  console.log(`Greffe lookup using ${format} format (${size})`);
}

/**
 * Finds the appropriate greffe (court registry) based on a postal code.
 * Uses compressed range-based format for optimal performance and memory usage.
 *
 * @param codePostal The postal code to look up.
 * @returns The name of the greffe or null if not found.
 */
export function findGreffeByCodePostal(codePostal: string): string | null {
  if (!codePostal) {
    return null;
  }

  // Use compressed format (preferred)
  if (useCompressedFormat) {
    return findGreffeInCompressedData(codePostal, greffeCompressedData as CompactGreffeData);
  }

  // Fallback to legacy format
  if (legacyGreffeIndex) {
    return legacyGreffeIndex[codePostal] || null;
  }

  // No data available
  if (environment.isDevelopment) {
    console.warn("No greffe data available - both compressed and legacy formats missing");
  }
  return null;
}

// The async and preload functions are no longer necessary as the file is
// handled by the bundler, but they are kept for compatibility with existing calls.
// They now resolve immediately with the synchronous result.

/**
 * Asynchronously finds the appropriate greffe (court registry) based on a postal code.
 * @deprecated This function is now synchronous under the hood. Use findGreffeByCodePostal instead.
 * @param codePostal The postal code to look up.
 * @returns A promise that resolves to the name of the greffe or null if not found.
 */
export async function findGreffeByCodePostalAsync(codePostal: string): Promise<string | null> {
  return Promise.resolve(findGreffeByCodePostal(codePostal));
}

/**
 * Preloads the greffe index. This function is now a no-op for backward compatibility
 * as the data is loaded at build time.
 */
export async function preloadGreffeIndex(): Promise<void> {
  if (environment.isDevelopment) {
    console.log("Greffe index is now statically imported. Preloading is no longer necessary.");
  }
  return Promise.resolve();
}
