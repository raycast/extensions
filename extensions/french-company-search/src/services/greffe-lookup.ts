import { environment } from "@raycast/api";
import greffeIndexData from "../../assets/greffes-index.json";

interface GreffeIndex {
  [codePostal: string]: string;
}

// Type guard to check if the data has the nested structure
function isNestedGreffeData(data: unknown): data is { byCodePostal: GreffeIndex } {
  return typeof data === "object" && data !== null && "byCodePostal" in data;
}

// The index is now loaded statically at build time.
// The 'byCodePostal' key check is for compatibility with the old format.
const greffeIndex: GreffeIndex = isNestedGreffeData(greffeIndexData)
  ? greffeIndexData.byCodePostal
  : (greffeIndexData as GreffeIndex);

/**
 * Finds the appropriate greffe (court registry) based on a postal code.
 * This function is now fully synchronous and performant as the data is in-memory.
 *
 * @param codePostal The postal code to look up.
 * @returns The name of the greffe or null if not found.
 */
export function findGreffeByCodePostal(codePostal: string): string | null {
  if (!codePostal) {
    return null;
  }
  return greffeIndex[codePostal] || null;
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
