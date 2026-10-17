import type { QmdFileListItem } from "../../types";

/**
 * Parse file list text output into structured data
 * Example input:
 *    209 B  Jan  1 13:30  qmd://obsidian/1-commonplace/canada-needs-school-choice.md
 */
export function parseFileList(output: string): QmdFileListItem[] {
  const files: QmdFileListItem[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    // Match: size date path
    // e.g., "   209 B  Jan  1 13:30  qmd://obsidian/1-commonplace/canada-needs-school-choice.md"
    const match = line.match(/^\s*[\d.]+\s*[KMGB]+\s+\w+\s+\d+\s+[\d:]+\s+(qmd:\/\/\S+)/);
    if (match) {
      const fullPath = match[1];
      // Extract just the path part after qmd://collection/
      const pathMatch = fullPath.match(/qmd:\/\/[^/]+\/(.+)$/);
      const path = pathMatch ? pathMatch[1] : fullPath;

      // Extract title from filename (remove .md extension)
      const filename = path.split("/").pop() || path;
      const title = filename.replace(/\.md$/, "").replace(/-/g, " ");

      files.push({
        path,
        docid: "", // Not available in ls output
        title,
        embedded: true, // Assume embedded since we can't tell from ls
      });
    }
  }

  return files;
}
