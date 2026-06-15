import { readFile, readdir } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";
import { resolveAndValidatePath, getWorkspaceRoot } from "../utils/workspace";

type Input = {
  /**
   * The search query (text to search for)
   */
  query: string;
  /**
   * Optional: The relative path to search within (defaults to "." for entire workspace)
   */
  path?: string;
  /**
   * Optional: Glob pattern to filter files (e.g., "*.ts", "*.{ts,tsx}")
   */
  glob?: string;
  /**
   * Optional: Case-sensitive search (defaults to false)
   */
  caseSensitive?: boolean;
};

type Match = {
  file: string;
  line: number;
  content: string;
};

const SKIP_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".cache", ".vscode", "coverage"];
const MAX_MATCHES = 100;
const MAX_LINE_LENGTH = 200;

// Binary file extensions to skip
const BINARY_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".db",
  ".sqlite",
  ".lock",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Simple glob pattern matching
 * Supports: *.ts, *.{ts,tsx}, test.*, etc.
 */
function matchGlob(filename: string, pattern: string): boolean {
  // Handle {a,b,c} syntax
  if (pattern.includes("{") && pattern.includes("}")) {
    const match = pattern.match(/\{([^}]+)\}/);
    if (match) {
      const options = match[1].split(",");
      return options.some((opt) => {
        const expandedPattern = pattern.replace(match[0], opt.trim());
        return matchGlob(filename, expandedPattern);
      });
    }
  }

  // Convert glob to regex
  const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

  return new RegExp(`^${regexPattern}$`, "i").test(filename);
}

/**
 * Check if a file should be skipped (binary files)
 */
function isBinaryFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}

/**
 * Recursively walk through directories and yield file paths
 */
async function* walkDir(dir: string): AsyncGenerator<string> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.includes(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walkDir(fullPath);
      } else if (entry.isFile() && !isBinaryFile(entry.name)) {
        yield fullPath;
      }
    }
  } catch {
    // Skip directories that can't be read
  }
}

export default async function ({ query, path = ".", glob, caseSensitive = false }: Input) {
  if (!query || query.trim() === "") {
    throw new Error("Search query is required");
  }

  const workspaceRoot = getWorkspaceRoot();
  const searchRoot = resolveAndValidatePath(path);

  const flags = caseSensitive ? "g" : "gi";
  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(escapedQuery, flags);

  const matches: Match[] = [];
  let filesSearched = 0;

  for await (const filePath of walkDir(searchRoot)) {
    // Apply glob filter if specified
    if (glob) {
      const filename = basename(filePath);
      if (!matchGlob(filename, glob)) continue;
    }

    // Stop if we've found enough matches
    if (matches.length >= MAX_MATCHES) break;

    filesSearched++;

    try {
      const content = await readFile(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((lineContent, index) => {
        // Reset regex lastIndex for each line (important for global flag)
        regex.lastIndex = 0;

        if (regex.test(lineContent) && matches.length < MAX_MATCHES) {
          matches.push({
            file: relative(workspaceRoot, filePath),
            line: index + 1,
            content: lineContent.trim().slice(0, MAX_LINE_LENGTH),
          });
        }
      });
    } catch {
      // Skip files that can't be read (e.g., binary files, permission issues)
    }
  }

  return {
    matches,
    totalMatches: matches.length,
    filesSearched,
    truncated: matches.length >= MAX_MATCHES,
  };
}
