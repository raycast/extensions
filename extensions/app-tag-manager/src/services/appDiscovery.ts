import { execSync } from "child_process";
import { AppInfo } from "../types";

export function discoverApps(): string[] {
  const output = execSync(`mdfind 'kMDItemContentType == "com.apple.application-bundle"'`).toString();
  const allPaths = output.split("\n").filter(Boolean);

  // 简化过滤：支持所有磁盘，只排除系统服务
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

export function updateDisplayNamesInBatches(
  paths: string[],
  onUpdate: (updates: { [path: string]: string }) => void,
): void {
  const batchSize = 20;
  let currentIndex = 0;

  const updateBatch = () => {
    if (currentIndex >= paths.length) return;

    const batch = paths.slice(currentIndex, currentIndex + batchSize);
    const updates: { [path: string]: string } = {};

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

      onUpdate(updates);
    } catch (error) {
      console.warn(`Failed to update display names for batch ${currentIndex}-${currentIndex + batchSize}:`, error);
    }

    currentIndex += batchSize;
    if (currentIndex < paths.length) {
      setTimeout(updateBatch, 50);
    }
  };

  setTimeout(updateBatch, 100);
}
