import fs from "node:fs";

/** 根目录下实际存在的文件夹名（含指向目录的符号链接）。读不到根目录返回 null。 */
export function presentFolderNames(projectsRoot: string): Set<string> | null {
  try {
    return new Set(
      fs
        .readdirSync(projectsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map((entry) => entry.name),
    );
  } catch {
    return null;
  }
}

/** 元数据里仍存着、但根目录中已找不到对应文件夹的项目 id（即「已移除」）。
 *  只看文件夹在不在，不管它有没有 .als —— 文件夹还在就保留数据，避免误清理仍存在的项目。
 *  根目录读不到时返回 null（不确定，调用方不应据此清理）。 */
export function removedProjectIds(projectsRoot: string, metadataIds: string[]): string[] | null {
  const present = presentFolderNames(projectsRoot);
  if (!present) return null;
  return metadataIds.filter((id) => !present.has(id)).sort();
}
