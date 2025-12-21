import { Collection } from "./types";

/**
 * Export collections to JSON string
 */
export function exportCollections(collections: Collection[]): string {
  return JSON.stringify(
    {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      collections,
    },
    null,
    2,
  );
}

/**
 * Import collections from JSON string
 */
export function importCollections(jsonString: string): Collection[] {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error("Invalid collection format");
    }

    return data.collections;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to import collections: ${errorMessage}`);
  }
}

/**
 * Export a single collection to JSON string
 */
export function exportCollection(collection: Collection): string {
  return JSON.stringify(
    {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      collection,
    },
    null,
    2,
  );
}
