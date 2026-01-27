import type { QmdCollection } from "../../types";

/**
 * Parse collection list text output into structured data
 * Example input:
 * Collections (1):
 *
 * obsidian (qmd://obsidian/)
 *   Pattern:  **\/*.md
 *   Files:    222
 *   Updated:  6d ago
 */
export function parseCollectionList(output: string): QmdCollection[] {
  const collections: QmdCollection[] = [];
  const lines = output.split("\n");

  let currentCollection: Partial<QmdCollection> | null = null;

  for (const line of lines) {
    // Match collection name line: "obsidian (qmd://obsidian/)"
    const collectionMatch = line.match(/^(\S+)\s+\(qmd:\/\/\S+\)/);
    if (collectionMatch) {
      // Save previous collection if exists
      if (currentCollection?.name) {
        collections.push(currentCollection as QmdCollection);
      }
      currentCollection = {
        name: collectionMatch[1],
        path: "", // We'll need to get this separately or leave empty
        mask: "**/*.md",
        documentCount: 0,
        embeddedCount: 0,
      };
      continue;
    }

    if (currentCollection) {
      // Match pattern line
      const patternMatch = line.match(/^\s+Pattern:\s+(.+)$/);
      if (patternMatch) {
        currentCollection.mask = patternMatch[1].trim();
        continue;
      }

      // Match files count line
      const filesMatch = line.match(/^\s+Files:\s+(\d+)/);
      if (filesMatch) {
        currentCollection.documentCount = Number.parseInt(filesMatch[1], 10);
      }
    }
  }

  // Don't forget the last collection
  if (currentCollection?.name) {
    collections.push(currentCollection as QmdCollection);
  }

  return collections;
}
