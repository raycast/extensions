import type { QmdCollectionStatus, QmdStatus } from "../../types";

interface StatusContext {
  path: string;
  description: string;
}

interface ParsedCollection extends QmdCollectionStatus {
  pattern: string;
  lastUpdated?: string;
  contexts: StatusContext[];
}

export interface ParsedStatus extends Omit<QmdStatus, "collections"> {
  databaseSize: string;
  collections: ParsedCollection[];
}

/**
 * Parses the text output of `qmd status` into structured data.
 *
 * Example input:
 * ```
 * QMD Status
 *
 * Index: /Users/user/.cache/qmd/index.sqlite
 * Size:  6.1 MB
 *
 * Documents
 *   Total:    222 files indexed
 *   Vectors:  505 embedded
 *   Updated:  6d ago
 *
 * Collections
 *   obsidian (qmd://obsidian/)
 *     Pattern:  **\/*.md
 *     Files:    222 (updated 6d ago)
 *     Contexts: 4
 *       //path/to/file.md: context description
 *       /: Collection context
 * ```
 */
export function parseStatus(text: string): ParsedStatus | null {
  if (!text?.includes("QMD Status")) {
    return null;
  }

  const lines = text.split("\n");
  const result: ParsedStatus = {
    version: "",
    databasePath: "",
    databaseSize: "",
    collections: [],
    totalDocuments: 0,
    embeddedDocuments: 0,
    pendingEmbeddings: 0,
    indexHealth: "healthy",
  };

  let currentSection = "";
  let currentCollection: ParsedCollection | null = null;
  let parsingContexts = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse index path
    if (trimmed.startsWith("Index:")) {
      result.databasePath = trimmed.replace("Index:", "").trim();
      continue;
    }

    // Parse size
    if (trimmed.startsWith("Size:")) {
      result.databaseSize = trimmed.replace("Size:", "").trim();
      continue;
    }

    // Detect sections
    if (trimmed === "Documents") {
      currentSection = "documents";
      continue;
    }
    if (trimmed === "Collections") {
      currentSection = "collections";
      continue;
    }
    if (trimmed === "Examples") {
      currentSection = "examples";
      continue;
    }

    // Parse documents section
    if (currentSection === "documents") {
      if (trimmed.startsWith("Total:")) {
        const match = trimmed.match(/Total:\s+(\d+)/);
        if (match) {
          result.totalDocuments = Number.parseInt(match[1], 10);
        }
      } else if (trimmed.startsWith("Vectors:")) {
        const match = trimmed.match(/Vectors:\s+(\d+)/);
        if (match) {
          result.embeddedDocuments = Number.parseInt(match[1], 10);
        }
      } else if (trimmed.startsWith("Updated:")) {
        result.lastUpdated = trimmed.replace("Updated:", "").trim();
      }
    }

    // Parse collections section
    if (currentSection === "collections") {
      // Check for new collection line (name with qmd:// path)
      const collectionMatch = trimmed.match(/^(\w+)\s+\(qmd:\/\/\w+\/?\)/);
      if (collectionMatch) {
        // Save previous collection
        if (currentCollection) {
          result.collections.push(currentCollection);
        }
        currentCollection = {
          name: collectionMatch[1],
          path: "",
          documentCount: 0,
          embeddedCount: 0,
          pattern: "",
          contexts: [],
        };
        parsingContexts = false;
        continue;
      }

      if (currentCollection) {
        if (trimmed.startsWith("Pattern:")) {
          currentCollection.pattern = trimmed.replace("Pattern:", "").trim();
        } else if (trimmed.startsWith("Files:")) {
          const filesMatch = trimmed.match(/Files:\s+(\d+)/);
          if (filesMatch) {
            currentCollection.documentCount = Number.parseInt(filesMatch[1], 10);
          }
          const updatedMatch = trimmed.match(/\(updated\s+(.+?)\)/);
          if (updatedMatch) {
            currentCollection.lastUpdated = updatedMatch[1];
          }
        } else if (trimmed.startsWith("Contexts:")) {
          parsingContexts = true;
        } else if (parsingContexts && trimmed.includes(":")) {
          // Context line: //path: description or /path: description
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex > 0) {
            const path = trimmed.substring(0, colonIndex).trim();
            const description = trimmed.substring(colonIndex + 1).trim();
            if (path.startsWith("/")) {
              currentCollection.contexts.push({ path, description });
            }
          }
        }
      }
    }
  }

  // Save last collection
  if (currentCollection) {
    result.collections.push(currentCollection);
  }

  // Calculate pending embeddings and health
  result.pendingEmbeddings = Math.max(0, result.totalDocuments - result.embeddedDocuments);
  if (result.pendingEmbeddings > 0) {
    result.indexHealth = "needs-embedding";
  }

  return result;
}
