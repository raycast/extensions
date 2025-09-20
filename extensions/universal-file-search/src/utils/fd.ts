import { execSync } from "child_process";
import { FileResult, SearchOptions } from "../types";
import { stat } from "fs/promises";
import { basename, extname } from "path";

export async function searchWithFd(
  query: string,
  options: SearchOptions = {},
): Promise<FileResult[]> {
  const {
    maxDepth = 20,
    type = "f",
    hidden = false,
    exclude = [
      ".git",
      "node_modules",
      ".DS_Store",
      "Library",
      ".Trash",
      ".npm",
      ".cache",
    ],
    limit = 200,
    searchMode = "glob",
    searchPath = "/",
  } = options;

  try {
    // Check if fd is installed - try multiple possible paths
    let fdPath = "";
    const possiblePaths = [
      "/opt/homebrew/bin/fd",
      "/usr/local/bin/fd",
      "/usr/bin/fd",
      "fd",
    ];

    for (const pathToTry of possiblePaths) {
      try {
        execSync(`${pathToTry} --version`, { encoding: "utf8" });
        fdPath = pathToTry;
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!fdPath) {
      throw new Error("fd is not installed. Please run: brew install fd");
    }

    // Build fd command based on search mode
    const excludeArgs = exclude.map((e) => `--exclude "${e}"`).join(" ");
    const hiddenArg = hidden ? "--hidden" : "";
    const typeArg = type === "all" ? "" : `--type ${type}`;

    // Handle search mode
    let modeArg = "";
    let searchPattern = query;

    if (searchMode === "glob") {
      // For glob mode, if the pattern doesn't contain wildcards, add them
      // This allows nginx.conf to match nginx.conf.backup
      if (!query.includes("*") && !query.includes("?")) {
        searchPattern = `*${query}*`;
      }
      modeArg = "--glob";
    }
    // regex mode is default, no special flag needed

    // Handle multiple search paths (comma-separated)
    const searchPaths = searchPath
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const pathArgs = searchPaths.map((p) => `"${p}"`).join(" ");

    const command = `${fdPath} ${hiddenArg} ${excludeArgs} --max-depth ${maxDepth} ${typeArg} ${modeArg} --no-ignore "${searchPattern}" ${pathArgs} 2>/dev/null | head -${limit}`;

    const result = execSync(command, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    });

    if (!result.trim()) {
      return [];
    }

    const paths = result.trim().split("\n").filter(Boolean);
    const files: FileResult[] = [];

    for (const filePath of paths) {
      try {
        const stats = await stat(filePath);
        files.push({
          path: filePath,
          name: basename(filePath),
          extension: extname(filePath).slice(1),
          size: stats.size,
          modifiedDate: stats.mtime,
          isDirectory: stats.isDirectory(),
        });
      } catch (error) {
        console.error(`Cannot access file: ${filePath}`, error);
      }
    }

    return files;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("fd is not installed")) {
      throw new Error("fd is not installed. Please run: brew install fd");
    }
    console.error("fd search error:", error);
    return [];
  }
}
