import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** 识别"同一个文件夹"的依据。inode 可缺省（旧数据没有）。 */
export type FolderIdentity = { birthtimeMs: number; inode?: number };

/** 项目清单里的一项：名字（= 文件夹名 = 项目 id）+ 文件夹身份。 */
export type SnapshotEntry = FolderIdentity & { id: string };

export type SnapshotDiff = {
  renamed: { from: SnapshotEntry; to: SnapshotEntry }[];
  removed: SnapshotEntry[];
  ambiguous: SnapshotEntry[];
  guardTripped: boolean;
};

/** 是否同一个文件夹：创建时间一致；双方都有 inode 时 inode 也必须一致。
 *  Finder 复制（⌘D/拷贝）会保留创建时间，但 inode 是新的，所以"复制后删原件"不会被当成改名。 */
export function sameFolder(a: FolderIdentity, b: FolderIdentity): boolean {
  if (Math.abs(a.birthtimeMs - b.birthtimeMs) >= 1) return false;
  return a.inode === undefined || b.inode === undefined || a.inode === b.inode;
}

/** 用于「确认删除」的严格匹配：读不到废纸篓、或待匹配项缺 inode（仅凭创建时间可能撞上另一个
 *  同时创建的文件夹）时，一律视为不确定、不确认在废纸篓里——交给手动清理，绝不自动归档。 */
export function isConfirmedInTrash(entry: FolderIdentity, trash: FolderIdentity[] | null): boolean {
  if (!trash || entry.inode === undefined) return false;
  return trash.some((folder) => sameFolder(folder, entry));
}

// 对比前后两份清单：
// - 消失项恰好对应一个新出现的同一文件夹（且该文件夹没被别的消失项认领）= 改名；
// - 没有对应 = 移除；
// - 对应多个，或被多个消失项认领 = 歧义，不自动处理。
export function diffSnapshots(previous: SnapshotEntry[], current: SnapshotEntry[]): SnapshotDiff {
  const currentIds = new Set(current.map((e) => e.id));
  const previousIds = new Set(previous.map((e) => e.id));
  const missing = previous.filter((e) => !currentIds.has(e.id));
  const appeared = current.filter((e) => !previousIds.has(e.id));

  const candidates = new Map(missing.map((m) => [m, appeared.filter((a) => sameFolder(a, m))] as const));
  const claims = new Map<SnapshotEntry, number>();
  for (const list of candidates.values()) {
    for (const a of list) claims.set(a, (claims.get(a) ?? 0) + 1);
  }

  const renamed: SnapshotDiff["renamed"] = [];
  const removed: SnapshotEntry[] = [];
  const ambiguous: SnapshotEntry[] = [];
  for (const [entry, list] of candidates) {
    if (list.length === 0) {
      removed.push(entry);
    } else if (
      list.length === 1 &&
      claims.get(list[0]) === 1 &&
      entry.inode !== undefined &&
      list[0].inode !== undefined
    ) {
      // 双方都有 inode 才认定为改名；旧快照没有 inode，分不清"改名"和"复制后删原件"，当作歧义跳过。
      renamed.push({ from: entry, to: list[0] });
    } else {
      ambiguous.push(entry);
    }
  }

  // 外接盘未挂载、根目录被整体移走等：项目一下子全没了，或一次消失过半（且多于 3 个），多半不是真删除，不处理。
  const guardTripped =
    removed.length > 0 &&
    ((current.length === 0 && previous.length > 0) || (removed.length > 3 && removed.length > previous.length / 2));
  return { renamed, removed: guardTripped ? [] : removed, ambiguous, guardTripped };
}

// 项目所在卷的废纸篓：系统盘为 ~/.Trash；外接盘为 /Volumes/<盘名>/.Trashes/<uid>。第一个永远是 ~/.Trash。
export function trashDirsFor(projectsRoot: string): string[] {
  const dirs = [path.join(os.homedir(), ".Trash")];
  const volume = path.resolve(projectsRoot).match(/^\/Volumes\/[^/]+/);
  if (volume && typeof process.getuid === "function") {
    dirs.push(path.join(volume[0], ".Trashes", String(process.getuid())));
  }
  return dirs;
}

/** 读出废纸篓里各文件夹的身份（创建时间 + inode）。Finder 遇同名会给文件夹改名，所以不看名字。
 *  ~/.Trash 不可读（没有完全磁盘访问权限）时返回 null，交给推测模式。 */
export function readTrashFolders(trashDirs: string[]): FolderIdentity[] | null {
  const folders: FolderIdentity[] = [];
  for (const [index, dir] of trashDirs.entries()) {
    let names: string[];
    try {
      names = fs.readdirSync(dir);
    } catch (error) {
      // 目录不存在 = 空废纸篓；~/.Trash 读不了（EPERM 等）= 没有权限。
      if (index === 0 && (error as NodeJS.ErrnoException)?.code !== "ENOENT") return null;
      continue;
    }
    for (const name of names) {
      try {
        const stats = fs.statSync(path.join(dir, name));
        if (stats.isDirectory()) folders.push({ birthtimeMs: stats.birthtimeMs, inode: stats.ino });
      } catch {
        // 读不了的条目跳过。
      }
    }
  }
  return folders;
}
