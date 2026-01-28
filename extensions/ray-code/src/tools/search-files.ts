import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { resolveAndValidatePath, getWorkspaceRoot } from "../utils/workspace";

type Input = {
  /**
   * The search query to match against file names (supports fuzzy matching)
   */
  query: string;
  /**
   * Optional: The relative path to search within (defaults to workspace root)
   */
  path?: string;
};

/**
 * Recursively searches for files matching the query
 */
async function searchFilesRecursive(dirPath: string, query: string, workspaceRoot: string): Promise<string[]> {
  const results: string[] = [];
  const queryLower = query.toLowerCase();

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      // Skip common directories that should be ignored
      if (entry.isDirectory()) {
        const skipDirs = ["node_modules", ".git", ".next", ".vscode", "dist", "build"];
        if (skipDirs.includes(entry.name)) {
          continue;
        }

        // Recursively search subdirectories
        const subResults = await searchFilesRecursive(fullPath, query, workspaceRoot);
        results.push(...subResults);
      }

      // Check if the file/directory name matches the query (fuzzy matching)
      const nameLower = entry.name.toLowerCase();
      if (fuzzyMatch(nameLower, queryLower)) {
        // Return relative path from workspace root
        const relativePath = relative(workspaceRoot, fullPath);
        results.push(relativePath);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return results;
}

/**
 * Simple fuzzy matching algorithm
 * Returns true if all characters in the query appear in order in the target string
 */
function fuzzyMatch(target: string, query: string): boolean {
  // Simple substring match
  if (target.includes(query)) {
    return true;
  }

  // Fuzzy match: check if all query characters appear in order
  let queryIndex = 0;
  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === query.length;
}

export default async function ({ query, path = "." }: Input) {
  if (!query || query.trim() === "") {
    throw new Error("Search query is required");
  }

  const workspaceRoot = getWorkspaceRoot();
  const searchPath = resolveAndValidatePath(path);

  const results = await searchFilesRecursive(searchPath, query, workspaceRoot);

  // Sort results by relevance (exact matches first, then by path length)
  results.sort((a, b) => {
    const aName = a.split("/").pop()?.toLowerCase() || "";
    const bName = b.split("/").pop()?.toLowerCase() || "";
    const queryLower = query.toLowerCase();

    // Exact matches first
    const aExact = aName === queryLower ? 0 : 1;
    const bExact = bName === queryLower ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    // Then by whether the query is at the start
    const aStarts = aName.startsWith(queryLower) ? 0 : 1;
    const bStarts = bName.startsWith(queryLower) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    // Then by path length (shorter paths first)
    return a.length - b.length;
  });

  return results;
}
