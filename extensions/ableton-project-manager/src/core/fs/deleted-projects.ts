import { assertWritable, readJson, updateJson } from "./storage";
import { archiveDocFiles, restoreArchivedDoc, type ArchivedDoc } from "@/core/docs/docs";
import {
  assertMetadataWritable,
  getAllProjectMetadata,
  restoreProjectMetadata,
  type ProjectMetadata,
} from "@/core/metadata/project-metadata";
import { assertOrdersWritable, getProjectOrders, restoreTrackNumber } from "@/core/metadata/collection-order";
import { assertRolesWritable, getProjectRoles, restoreRole } from "@/core/metadata/collection-roles";
import { collectionTaxonomy } from "@/core/metadata/taxonomies";
import { sameFolder, type FolderIdentity } from "./project-snapshot";
import type { Project } from "@/core/projects/types";

const STORAGE_KEY = "deleted-projects";
// 与 Finder 的"30 天后从废纸篓中移除项目"对齐。过期只丢弃记录，归档的文档文件保留。
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type DeletedRecord = FolderIdentity & {
  id: string;
  deletedAt: number;
  metadata: ProjectMetadata | null;
  orders: Record<string, number>; // collectionId → 轨号
  roles: Record<string, string>; // collectionId → 角色
  docs: ArchivedDoc[];
  dataRestored?: boolean; // 已放回、数据已还原，只剩文档在等文件夹可用后重试
};

/** 用来匹配记录的文件夹信息：名字 + 创建时间 + inode（旧数据可能没有）。 */
type FolderRef = { id: string; createdAt: number; inode?: number };

// 读出时顺带丢掉过期记录；下一次写入时它们就不再存在。
function parseRecords(value: unknown): DeletedRecord[] {
  const cutoff = Date.now() - RETENTION_MS;
  return Array.isArray(value) ? (value as DeletedRecord[]).filter((r) => r.deletedAt >= cutoff) : [];
}

const noRecords = (): DeletedRecord[] => [];

function getRecords(): Promise<DeletedRecord[]> {
  return readJson(STORAGE_KEY, parseRecords, noRecords);
}

// 删除记录损坏时 updateJson 拒绝写入：损坏的记录仍可能可恢复，绝不覆盖。
async function updateRecords(update: (records: DeletedRecord[]) => DeletedRecord[] | null): Promise<void> {
  await updateJson(STORAGE_KEY, parseRecords, noRecords, update);
}

// 同名且是同一个文件夹（创建时间 + inode）才算"放回"：Put Back 只是挪回原处；同名新项目或复制品都对不上。
function isSameFolder(record: DeletedRecord, folder: FolderRef): boolean {
  return record.id === folder.id && sameFolder(record, { birthtimeMs: folder.createdAt, inode: folder.inode });
}

// 同一条记录的标识：id + 删除时间（重新读出后对象引用不同，不能用 ===）。
function recordKey(record: DeletedRecord): string {
  return `${record.id}\n${record.deletedAt}`;
}

/** 该文件夹是否已有删除记录，用于避免重复归档。 */
export async function hasDeletedRecord(entry: { id: string; birthtimeMs: number; inode?: number }): Promise<boolean> {
  const records = await getRecords();
  return records.some((r) => isSameFolder(r, { id: entry.id, createdAt: entry.birthtimeMs, inode: entry.inode }));
}

/** 只保留 keep 返回 true 的记录（废纸篓被清空后提前作废用）。 */
export async function pruneDeletedRecords(
  keep: (record: { id: string; birthtimeMs: number; inode?: number }) => boolean,
): Promise<void> {
  await updateRecords((records) => {
    const kept = records.filter((record) => keep(record));
    return kept.length !== records.length ? kept : null;
  });
}

/** Move to Trash 之前调用：删除流程要写的存储（删除记录、元数据、轨号、角色）都能写才放行。
 *  有一份损坏就抛 StorageUnreadableError，项目文件夹还没动。 */
export async function assertDeletionWritable(): Promise<void> {
  await assertWritable(STORAGE_KEY);
  await assertMetadataWritable();
  await assertOrdersWritable();
  await assertRolesWritable();
}

/** 项目移到废纸篓后、清理数据前调用：存下标签/合集轨号/角色，并把自定义文件夹里的文档移进 Deleted Projects/。 */
export async function archiveDeletedProject(project: FolderRef & { title: string }): Promise<void> {
  // 文档移走了就回不去：先确认删除记录写得进去，存储损坏时直接报错、什么都不动。
  await assertWritable(STORAGE_KEY);
  const store = await getAllProjectMetadata();
  const orders = await getProjectOrders(project.id);
  const roles = await getProjectRoles(project.id);
  const docs = archiveDocFiles(project.title);
  await updateRecords((records) => {
    const previous = records.find((r) => isSameFolder(r, project));
    const record: DeletedRecord = {
      id: project.id,
      birthtimeMs: project.createdAt,
      inode: project.inode,
      deletedAt: Date.now(),
      // 同一文件夹已有记录、而这次读到的是空（例如数据已被前一次归档清掉）时沿用旧记录，不让空数据盖掉完整记录。
      metadata: store[project.id] ?? previous?.metadata ?? null,
      orders: Object.keys(orders).length > 0 ? orders : (previous?.orders ?? {}),
      roles: Object.keys(roles).length > 0 ? roles : (previous?.roles ?? {}),
      // 上次放回时还没还原成功的文档，继续跟着这条记录。
      docs: [...docs, ...(previous?.docs ?? [])],
    };
    return [...records.filter((r) => r !== previous), record];
  });
}

// 还原元数据与映射。只往空位里写：期间若已有新数据（或合集已被删），以现状为准。
async function restoreData(record: DeletedRecord, existingCollections: Set<string>): Promise<void> {
  if (record.metadata) {
    await restoreProjectMetadata(record.id, {
      ...record.metadata,
      collectionIds: (record.metadata.collectionIds ?? []).filter((id) => existingCollections.has(id)),
    });
  }

  for (const [collectionId, number] of Object.entries(record.orders)) {
    if (existingCollections.has(collectionId)) await restoreTrackNumber(collectionId, record.id, number);
  }

  for (const [collectionId, role] of Object.entries(record.roles)) {
    if (existingCollections.has(collectionId)) await restoreRole(collectionId, record.id, role);
  }
}

export type RestoreResult = { restored: string[]; docConflicts: string[] };

/** 扫描到的项目里，若有从废纸篓放回的，还原其数据与文档。每次加载项目列表时调用。
 *  文档文件夹暂时不可用时，数据照常还原，记录里只留下待还原的文档，下次加载再试。 */
export async function restorePutBackProjects(projects: Project[]): Promise<RestoreResult> {
  const result: RestoreResult = { restored: [], docConflicts: [] };
  const records = await getRecords();
  if (records.length === 0) return result;

  const handled = new Set<string>();
  const pending: DeletedRecord[] = [];
  let existingCollections: Set<string> | null = null;

  for (const record of records) {
    const project = projects.find((p) => isSameFolder(record, p));
    if (!project) continue;
    handled.add(recordKey(record));

    if (!record.dataRestored) {
      existingCollections ??= new Set((await collectionTaxonomy.get()).map((c) => c.id));
      await restoreData(record, existingCollections);
      result.restored.push(project.title);
    }

    const pendingDocs: ArchivedDoc[] = [];
    for (const doc of record.docs) {
      const status = restoreArchivedDoc(project, doc);
      if (status === "unavailable") pendingDocs.push(doc);
      if (status === "conflict" && !result.docConflicts.includes(project.title)) {
        result.docConflicts.push(project.title);
      }
    }

    if (pendingDocs.length > 0) {
      // 数据已还原、清空，下次重试只处理文档，不会把用户之后的改动改回去。
      pending.push({ ...record, dataRestored: true, metadata: null, orders: {}, roles: {}, docs: pendingDocs });
    }
  }

  if (handled.size > 0) {
    // 只替换本次处理过的记录；期间新增的记录（如另一处刚归档的）原样保留。
    await updateRecords((current) => [...current.filter((r) => !handled.has(recordKey(r))), ...pending]);
  }
  return result;
}
