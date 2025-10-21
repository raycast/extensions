import { execSync } from "child_process";
import { AppInfo } from "../types";

export function discoverApps(): string[] {
  const output = execSync(`mdfind 'kMDItemContentType == "com.apple.application-bundle"'`).toString();
  const allPaths = output.split("\n").filter(Boolean);

  return allPaths.filter((path) => {
    const isMainApp = path.match(/\/Applications\/[^/]+\.app$/) || path.match(/\/System\/Applications\/[^/]+\.app$/);
    const isSystemService =
      path.includes("/Contents/") ||
      path.includes("/Helpers/") ||
      path.includes("/Support/") ||
      path.includes("/Library/");
    return isMainApp && !isSystemService;
  });
}

export function createInitialApps(paths: string[], tagMap: { [key: string]: string[] }): AppInfo[] {
  return paths.map((path) => {
    const name = path.split("/").pop()?.replace(".app", "") || "Unknown";
    return {
      name,
      displayName: name,
      path,
      tags: tagMap[name] || [],
    };
  });
}

export async function loadDisplayNames(paths: string[]): Promise<{ [path: string]: string }> {
  const updates: { [path: string]: string } = {};
  const batchSize = 20;

  // Process in batches to avoid command line length limits
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);

    try {
      const batchCmd = batch.map((p) => `mdls -name kMDItemDisplayName -raw "${p}"`).join(' && echo "---" && ');
      const results = execSync(batchCmd, { timeout: 3000 }).toString().split("---");

      batch.forEach((path, index) => {
        if (results[index]) {
          const result = results[index].trim();
          if (result && result !== "(null)") {
            updates[path] = result.replace(".app", "");
          }
        }
      });
    } catch (error) {
      console.warn(`Failed to update display names for batch ${i}-${i + batchSize}:`, error);
    }
  }

  return updates;
}
