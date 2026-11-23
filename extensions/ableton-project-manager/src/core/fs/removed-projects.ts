import fs from "node:fs";
import { daw } from "@/daws";

/** 根目录下实际存在的项目 id（条目名经 DAW 换算，含指向目录的符号链接）。读不到根目录返回 null。 */
export function presentFolderNames(projectsRoot: string): Set<string> | null {
  try {
    return new Set(
      fs
        .readdirSync(projectsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map((entry) => daw.projectIdForEntry(entry.name)),
    );
  } catch {
    return null;
  }
}

/** 元数据里仍存着、但根目录中已找不到对应条目的项目 id（即「已移除」）。
 *  只看条目在不在，不管它里面有没有 Set —— 条目还在就保留数据，避免误清理仍存在的项目。
 *  根目录读不到时返回 null（不确定，调用方不应据此清理）。 */
export function removedProjectIds(projectsRoot: string, metadataIds: string[]): string[] | null {
  const present = presentFolderNames(projectsRoot);
  if (!present) return null;
  return metadataIds.filter((id) => !present.has(id)).sort();
}
