import path from "node:path";
import { LocalStorage } from "@raycast/api";
import type { Project } from "@/core/projects/types";
import {
  diffSnapshots,
  isConfirmedInTrash,
  readTrashFolders,
  sameFolder,
  trashDirsFor,
  type SnapshotEntry,
} from "./project-snapshot";
import { deleteProjectMetadata, renameProjectMetadata } from "@/core/metadata/project-metadata";
import { removeProjectFromAllOrders, renameProjectInAllOrders } from "@/core/metadata/collection-order";
import { removeProjectFromAllRoles, renameProjectInAllRoles } from "@/core/metadata/collection-roles";
import { renameDocFiles } from "@/core/docs/docs";
import { archiveDeletedProject, hasDeletedRecord, pruneDeletedRecords } from "./deleted-projects";

// 每个 Projects Folder 各存一份清单：换到新文件夹时当作首次使用，换回来仍和它自己的清单比对。
const SNAPSHOT_PREFIX = "project-snapshot:";
// 旧版本只存一份清单，不记属于哪个文件夹。
const LEGACY_SNAPSHOT_KEY = "project-snapshot";

function snapshotKey(projectsRoot: string): string {
  return SNAPSHOT_PREFIX + path.resolve(projectsRoot);
}

async function readSnapshot(key: string): Promise<SnapshotEntry[] | null> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SnapshotEntry[]) : null;
  } catch {
    return null;
  }
}

export type FinderSyncResult = {
  renamed: number;
  archived: number;
  ambiguous: number;
  guardTripped: boolean;
  trashUnavailable: boolean;
  /** Finder 改名后，笔记 / 歌词没能跟着改名的项目（新名字）。 */
  docRenameIssues: string[];
};

/** 对比上次看到的项目清单，把在 Finder 里做的改名/删除补做一遍。
 *  改名：同一文件夹（创建时间 + inode）换了名字 → 迁移元数据、轨号、角色、文档名。
 *  删除：只有能读到废纸篓、且确认项目就在废纸篓里时才处理；没有完全磁盘访问权限时不动数据，交给 Clean up Leftovers。
 *  歧义（多个候选）不自动处理。skipIds：正在由扩展自己执行 Move to Trash 的项目，已归档过。 */
export async function syncFinderChanges(
  projects: Project[],
  projectsRoot: string,
  skipIds: Set<string>,
): Promise<FinderSyncResult> {
  const current: SnapshotEntry[] = projects.map((p) => ({ id: p.id, birthtimeMs: p.createdAt, inode: p.inode }));
  const key = snapshotKey(projectsRoot);
  const own = await readSnapshot(key);
  // 这个文件夹还没有自己的清单：试试旧版本留下的那份。
  const legacy = own ? null : await readSnapshot(LEGACY_SNAPSHOT_KEY);
  let diff = own ? diffSnapshots(own, current) : legacy ? diffSnapshots(legacy, current) : null;
  // 旧清单对不上（多半是换了 Projects Folder）：当作首次使用，不报警；旧清单留给它原本的文件夹认领。
  const legacyMismatch = legacy !== null && diff?.guardTripped === true;
  if (legacyMismatch) diff = null;

  const result: FinderSyncResult = {
    renamed: 0,
    archived: 0,
    ambiguous: 0,
    guardTripped: false,
    trashUnavailable: false,
    docRenameIssues: [],
  };

  if (diff) {
    result.guardTripped = diff.guardTripped;
    result.ambiguous = diff.ambiguous.length;

    for (const { from, to } of diff.renamed) {
      await renameProjectMetadata(from.id, to.id);
      await renameProjectInAllOrders(from.id, to.id);
      await renameProjectInAllRoles(from.id, to.id);
      const docs = renameDocFiles(from.id, to.id);
      if (docs.conflicts.length > 0 || docs.failures.length > 0) result.docRenameIssues.push(to.id);
      result.renamed++;
    }

    const trash = readTrashFolders(trashDirsFor(projectsRoot));
    if (!trash && diff.removed.length > 0) result.trashUnavailable = true;
    for (const entry of diff.removed) {
      if (skipIds.has(entry.id) || (await hasDeletedRecord(entry))) continue;
      // 只有能读到废纸篓、且确认该项目确实在废纸篓里，才按「删除」归档清理。
      // 读不到废纸篓（无完全磁盘访问权限），或旧快照缺 inode 无法可靠匹配时，一律不动数据，交给手动清理。
      if (!isConfirmedInTrash(entry, trash)) continue;
      await archiveDeletedProject({
        id: entry.id,
        title: entry.id,
        createdAt: entry.birthtimeMs,
        inode: entry.inode,
      });
      await deleteProjectMetadata(entry.id);
      await removeProjectFromAllOrders(entry.id);
      await removeProjectFromAllRoles(entry.id);
      result.archived++;
    }

    if (trash) {
      // 废纸篓被清空（或项目被彻底删除）后已无从放回，提前作废记录；归档的文档文件保留。
      await pruneDeletedRecords(
        (record) =>
          trash.some((folder) => sameFolder(folder, record)) ||
          current.some((c) => c.id === record.id && sameFolder(c, record)),
      );
    }
  }

  // 保护触发时不覆盖旧清单，等磁盘接回来后照常对比。
  if (!result.guardTripped) {
    await LocalStorage.setItem(key, JSON.stringify(current));
    // 旧清单已被这个文件夹认领，迁到新 key 后删掉。
    if (legacy && !legacyMismatch) await LocalStorage.removeItem(LEGACY_SNAPSHOT_KEY);
  }
  return result;
}
