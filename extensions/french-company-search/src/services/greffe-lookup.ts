import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";

interface GreffeIndex {
  [codePostal: string]: string;
}

// Cache for the greffe index
let greffeIndex: GreffeIndex | null = null;
let loadingPromise: Promise<GreffeIndex> | null = null;

/**
 * Loads the greffe index from the JSON file asynchronously
 * Uses promise caching to avoid multiple concurrent loads
 */
async function loadGreffeIndexAsync(): Promise<GreffeIndex> {
  if (greffeIndex !== null) {
    return greffeIndex;
  }

  // If already loading, return the existing promise
  if (loadingPromise !== null) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const jsonPath = join(environment.assetsPath, "greffes-index.json");
      console.log("Loading greffe index from:", jsonPath);
      const fileContent = await readFile(jsonPath, "utf-8");
      greffeIndex = JSON.parse(fileContent);
      return greffeIndex!;
    } catch (error) {
      console.error("Failed to load greffe index asynchronously:", error);
      // Reset loading promise on error to allow retry
      loadingPromise = null;
      return {};
    }
  })();

  return loadingPromise;
}

/**
 * Loads the greffe index from the JSON file synchronously (fallback)
 * Uses lazy loading to avoid blocking the main thread
 */
function loadGreffeIndexSync(): GreffeIndex {
  if (greffeIndex !== null) {
    return greffeIndex;
  }

  try {
    const jsonPath = join(environment.assetsPath, "greffes-index.json");
    const fileContent = readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(fileContent);

    // Check if the file has the expected structure
    if (parsed.byCodePostal) {
      greffeIndex = parsed.byCodePostal;
    } else {
      greffeIndex = parsed;
    }

    return greffeIndex!;
  } catch (error) {
    console.error("Failed to load greffe index synchronously:", error);
    return {};
  }
}

/**
 * Finds the appropriate greffe (court registry) based on postal code
 * Uses synchronous loading for immediate results
 */
export function findGreffeByCodePostal(codePostal: string): string | null {
  try {
    const index = loadGreffeIndexSync();
    return index[codePostal] || null;
  } catch (error) {
    console.error("Error looking up greffe for postal code:", codePostal, error);
    return null;
  }
}

/**
 * Finds the appropriate greffe (court registry) based on postal code asynchronously
 * Preferred method for better performance
 */
export async function findGreffeByCodePostalAsync(codePostal: string): Promise<string | null> {
  try {
    const index = await loadGreffeIndexAsync();
    return index[codePostal] || null;
  } catch (error) {
    console.error("Error looking up greffe for postal code asynchronously:", codePostal, error);
    return null;
  }
}

/**
 * Preloads the greffe index to improve performance of subsequent lookups
 * Call this during application initialization
 */
export async function preloadGreffeIndex(): Promise<void> {
  try {
    await loadGreffeIndexAsync();
    console.log("Greffe index preloaded successfully");
  } catch (error) {
    console.error("Failed to preload greffe index:", error);
  }
}
