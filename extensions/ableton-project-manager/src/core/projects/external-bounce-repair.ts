import fs from "node:fs";
import path from "node:path";
import { listBounces } from "./bounces";

// 登记路径还在不在。读不到就算丢了。
function isMissing(file: string): boolean {
  try {
    return !fs.statSync(file).isFile();
  } catch {
    return true;
  }
}

/**
 * 找回登记路径失效的外部文件：在原来的文件夹和共享文件夹顶层里，找大小相同、修改时间相同（精确到秒）的音频文件。
 * 恰好找到一个，并且它还没被这个项目登记，才算找回。
 * 返回 旧路径 → 新路径；没有找回的不出现在结果里。
 */
export function findMovedBounceFiles(
  files: string[],
  fingerprints: Record<string, { size: number; mtimeMs: number }>,
  sharedFolder: string | null,
): Map<string, string> {
  const moves = new Map<string, string>();
  const registered = new Set(files);
  // 已经找回的路径不能再被另一个旧路径认领，否则两个登记会指向同一个文件。
  const claimed = new Set<string>();

  for (const file of files) {
    const fingerprint = fingerprints[file];
    if (!fingerprint) continue;
    // 还在原处：不用找。
    if (!isMissing(file)) continue;

    const folders = [path.dirname(file)];
    if (sharedFolder !== null && sharedFolder !== path.dirname(file)) folders.push(sharedFolder);

    const candidates: string[] = [];
    for (const folder of folders) {
      for (const bounce of listBounces(folder)) {
        if (bounce.path === file || registered.has(bounce.path) || claimed.has(bounce.path)) continue;
        if (bounce.size !== fingerprint.size) continue;
        if (Math.floor(bounce.modifiedAt / 1000) !== Math.floor(fingerprint.mtimeMs / 1000)) continue;
        candidates.push(bounce.path);
      }
    }
    // 有多个候选时无法确定是哪一个，宁可不找回。
    if (candidates.length !== 1) continue;
    moves.set(file, candidates[0]);
    claimed.add(candidates[0]);
  }

  return moves;
}
