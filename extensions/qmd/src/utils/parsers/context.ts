import type { QmdContext } from "../../types";

/**
 * Parse context list text output into structured data
 * Example input:
 * Configured Contexts
 *
 * obsidian
 *   /path/to/file.md
 *     Description for file
 *   / (root)
 *     Personal notes and ideas
 */
export function parseContextList(output: string): QmdContext[] {
  const contexts: QmdContext[] = [];
  const lines = output.split("\n");

  let currentCollection: string | null = null;
  let currentPath: string | null = null;

  for (const line of lines) {
    // Skip header line
    if (line.startsWith("Configured Contexts") || line.trim() === "") {
      continue;
    }

    // Collection name (no leading spaces)
    if (line.match(/^\S/) && !line.includes("(")) {
      currentCollection = line.trim();
      continue;
    }

    // Path line (2 spaces indent) - with or without annotation
    // Matches: "  / (root)" or "  /path/to/file.md" or "  path/to/file.md"
    const pathWithAnnotation = line.match(/^\s{2}(\S+)\s+\([^)]+\)/);
    const pathWithoutAnnotation = line.match(/^\s{2}(\S+)$/);

    if ((pathWithAnnotation || pathWithoutAnnotation) && currentCollection) {
      const rawPath = pathWithAnnotation?.[1] || pathWithoutAnnotation?.[1] || null;
      currentPath = rawPath;
      continue;
    }

    // Description line (4 spaces indent)
    const descMatch = line.match(/^\s{4}(.+)$/);
    if (descMatch && currentCollection && currentPath) {
      // Build qmd:// URL preserving exact path format from qmd
      // Root "/" becomes just the collection, other paths are appended with a separator
      const qmdPath = currentPath === "/" ? `qmd://${currentCollection}` : `qmd://${currentCollection}/${currentPath}`;

      contexts.push({
        path: qmdPath,
        description: descMatch[1].trim(),
      });
      currentPath = null; // Reset after adding context
    }
  }

  return contexts;
}
