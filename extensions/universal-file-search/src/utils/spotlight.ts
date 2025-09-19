import { execSync } from "child_process";
import { FileResult } from "../types";
import { stat } from "fs/promises";
import { basename, extname } from "path";
import { homedir } from "os";

export async function searchWithSpotlight(
  query: string,
  limit = 100,
  searchPath = "~",
): Promise<FileResult[]> {
  try {
    // Handle multiple search paths
    const searchPaths = searchPath
      .split(",")
      .map((p) => p.trim().replace("~", homedir()));

    // Build mdfind command for multiple paths
    const commands = searchPaths.map(
      (path) => `mdfind -onlyin '${path}' 'kMDItemFSName == "*${query}*"c'`,
    );
    const command = `(${commands.join(" ; ")}) | head -${limit}`;

    const result = execSync(command, { encoding: "utf8" });

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
        // Ignore files that cannot be accessed
        console.error(`Cannot access file: ${filePath}`, error);
      }
    }

    return files;
  } catch (error) {
    console.error("Spotlight search error:", error);
    return [];
  }
}
