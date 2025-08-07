import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { SearchResult } from "../types";

/**
 * Helper function for better directory name matching
 * Implements fuzzy matching with priority order: exact > starts with > contains > fuzzy
 */
function isDirectoryMatch(dirName: string, query: string): boolean {
  const lowerDirName = dirName.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match gets highest priority
  if (lowerDirName === lowerQuery) return true;

  // Starts with query
  if (lowerDirName.startsWith(lowerQuery)) return true;

  // Contains query
  if (lowerDirName.includes(lowerQuery)) return true;

  // Fuzzy match: check if all query characters appear in order
  let queryIndex = 0;
  for (let i = 0; i < lowerDirName.length && queryIndex < lowerQuery.length; i++) {
    if (lowerDirName[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

interface SearchConfig {
  path: string;
  maxDepth: number;
  priority: number;
}

/**
 * Get platform-specific search configurations with prioritized paths
 * Higher priority numbers = lower priority in search
 */
function getSearchConfigs(isWindows: boolean): SearchConfig[] {
  const homedir = os.homedir();

  const configs: SearchConfig[] = [
    // High priority: user directories (shallow search)
    { path: homedir, maxDepth: 2, priority: 1 },
    { path: path.join(homedir, "Documents"), maxDepth: 3, priority: 1 },
    { path: path.join(homedir, "Desktop"), maxDepth: 2, priority: 1 },
    { path: path.join(homedir, "Downloads"), maxDepth: 2, priority: 1 },
  ];

  if (isWindows) {
    // Medium priority: Windows-specific development directories
    configs.push(
      { path: "C:\\", maxDepth: 1, priority: 2 },
      { path: "D:\\", maxDepth: 1, priority: 2 },
      // Lower priority: Windows system directories (very shallow)
      { path: "C:\\Program Files", maxDepth: 1, priority: 3 },
      { path: "C:\\Program Files (x86)", maxDepth: 1, priority: 3 },
    );
  } else {
    // Medium priority: Unix-like development directories
    configs.push(
      { path: "/Users", maxDepth: 2, priority: 2 },
      { path: "/opt", maxDepth: 2, priority: 2 },
      // Lower priority: Unix system directories (very shallow)
      { path: "/Applications", maxDepth: 1, priority: 3 },
      { path: "/usr/local", maxDepth: 2, priority: 3 },
    );
  }

  return configs;
}

/**
 * Priority-based directory search with performance optimizations
 * Uses async generator for streaming results and early termination
 */
export async function* searchDirectories(query: string, maxResults: number): AsyncGenerator<SearchResult> {
  if (!query.trim()) return;

  const isWindows = os.platform() === "win32";
  let yielded = 0;

  // Get search paths in priority order (lower number = higher priority)
  const searchConfigs = getSearchConfigs(isWindows);
  searchConfigs.sort((a, b) => a.priority - b.priority);

  for (const config of searchConfigs) {
    if (yielded >= maxResults) break;

    try {
      if (!fs.existsSync(config.path)) continue;

      yield* searchInDirectory(config.path, query.toLowerCase(), maxResults - yielded, config.maxDepth, (count) => {
        yielded += count;
      });
    } catch {
      // Skip directories we can't access
      continue;
    }
  }
}

/**
 * Recursively search in a directory with depth control and early termination
 */
async function* searchInDirectory(
  dirPath: string,
  query: string,
  remainingResults: number,
  maxDepth: number,
  onYield?: (count: number) => void,
): AsyncGenerator<SearchResult> {
  if (maxDepth <= 0 || remainingResults <= 0) return;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    // Filter directories and skip problematic ones early
    const directories = entries.filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !["node_modules", "__pycache__", ".git", ".svn", "Trash"].includes(entry.name),
    );

    let localYielded = 0;

    // First pass: check current level directories
    for (const entry of directories) {
      if (remainingResults - localYielded <= 0) break;

      const fullPath = path.join(dirPath, entry.name);

      // Check if directory name matches query
      if (isDirectoryMatch(entry.name, query)) {
        const displayName = fullPath.replace(os.homedir(), "~");
        yield {
          name: displayName,
          path: fullPath,
        };
        localYielded++;
        onYield?.(1);
      }
    }

    // Second pass: recurse into subdirectories (if we still need more results)
    if (maxDepth > 1 && remainingResults - localYielded > 0) {
      for (const entry of directories) {
        if (remainingResults - localYielded <= 0) break;

        const fullPath = path.join(dirPath, entry.name);

        try {
          yield* searchInDirectory(fullPath, query, remainingResults - localYielded, maxDepth - 1, (count) => {
            localYielded += count;
            onYield?.(count);
          });
        } catch {
          // Skip directories we can't access
          continue;
        }
      }
    }
  } catch {
    // Skip directories we can't access
    return;
  }
}
