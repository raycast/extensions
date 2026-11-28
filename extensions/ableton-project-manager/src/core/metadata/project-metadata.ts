import fs from "node:fs";
import { assertWritable, readJson, updateJson } from "@/core/fs/storage";

export type ProjectMetadata = {
  stageId: string | null;
  genreIds: string[];
  collectionIds: string[];
  pinned: boolean;
  pinOrder: number | null;
  notes: string;
  // 外部 bounce 来源（绝对路径）：叠加在默认 Bounces 文件夹之上，不替换它。
  externalBounceFolders: string[];
  externalBounceFiles: string[];
  // 共享 Bounces 文件夹里认这个项目的别名：文件名以别名开头的 bounce 也归它（规则和项目名一样）。
  bounceAliases: string[];
  // 项目改名前的名字：共享文件夹里以它开头、并且在 before（毫秒时间戳）之前创建的 bounce 仍归这个项目。
  previousBounceNames: { name: string; before: number }[];
  // 共享文件夹里被标成「不属于这个项目」的文件名（Not This Project）。文件改了名，就按新名字重新配对。
  excludedSharedBounces: string[];
  // 手动登记的外部文件的指纹（路径 → 大小和修改时间），文件在 Finder 里改名或移动后用来找回。
  externalBounceFingerprints: Record<string, { size: number; mtimeMs: number }>;
};

const PROJECT_METADATA_STORAGE_KEY = "project-metadata";

type ProjectMetadataStore = Record<string, ProjectMetadata>;

const EMPTY_PROJECT_METADATA: ProjectMetadata = {
  stageId: null,
  genreIds: [],
  collectionIds: [],
  pinned: false,
  pinOrder: null,
  notes: "",
  externalBounceFolders: [],
  externalBounceFiles: [],
  bounceAliases: [],
  previousBounceNames: [],
  excludedSharedBounces: [],
  externalBounceFingerprints: {},
};

export function parseStore(value: unknown): ProjectMetadataStore {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ProjectMetadataStore) : {};
}

const emptyStore = (): ProjectMetadataStore => ({});

function readStore(): Promise<ProjectMetadataStore> {
  return readJson(PROJECT_METADATA_STORAGE_KEY, parseStore, emptyStore);
}

// 所有写入都走这里：一次读—改—写回，并发更新排队，存储损坏时拒绝写入。update 返回 null 表示没有变化。
async function updateStore(update: (store: ProjectMetadataStore) => ProjectMetadataStore | null): Promise<void> {
  await updateJson(PROJECT_METADATA_STORAGE_KEY, parseStore, emptyStore, update);
}

/** 预检：元数据能写（损坏时抛 StorageUnreadableError）。在改名、删除这类会先动文件的操作之前调用。 */
export function assertMetadataWritable(): Promise<void> {
  return assertWritable(PROJECT_METADATA_STORAGE_KEY);
}

// 用 EMPTY 兜底展开，保证老数据缺的字段也有默认值。
export function withDefaults(metadata: Partial<ProjectMetadata> | undefined): ProjectMetadata {
  return { ...EMPTY_PROJECT_METADATA, ...(metadata ?? {}) };
}

export async function getProjectMetadata(projectId: string): Promise<ProjectMetadata> {
  const store = await readStore();
  return withDefaults(store[projectId]);
}

export async function saveProjectMetadata(projectId: string, metadata: ProjectMetadata): Promise<void> {
  await updateStore((store) => {
    store[projectId] = metadata;
    return store;
  });
}

export async function getAllProjectMetadata(): Promise<ProjectMetadataStore> {
  return readStore();
}

// 只在该项目还没有元数据时写入（从废纸篓放回时还原用：期间若已有新数据，以现状为准）。
export async function restoreProjectMetadata(projectId: string, metadata: ProjectMetadata): Promise<void> {
  await updateStore((store) => {
    if (projectId in store) return null;
    store[projectId] = metadata;
    return store;
  });
}

// 去重、去空白。
const dedupePaths = (paths: string[]) => Array.from(new Set(paths.map((p) => p.trim()).filter((p) => p !== "")));

// 读一个文件的指纹；读不到（不存在、没权限）时返回 null，不记也不报错。
function fingerprintOf(file: string): { size: number; mtimeMs: number } | null {
  try {
    const stats = fs.statSync(file);
    return { size: stats.size, mtimeMs: stats.mtimeMs };
  } catch {
    return null;
  }
}

// 覆盖式写入某项目的外部 bounce 来源（去重、去空白）。随 ProjectMetadata 一起在改名/移动时迁移。
export async function setExternalBounces(
  projectId: string,
  externalBounceFolders: string[],
  externalBounceFiles: string[],
): Promise<void> {
  const files = dedupePaths(externalBounceFiles);
  const fresh = new Map(files.map((file) => [file, fingerprintOf(file)] as const));
  await updateStore((store) => {
    const meta = withDefaults(store[projectId]);
    // 只留列表里还在的路径的指纹；读不到的文件（如硬盘没插）保留上次的指纹，之后改名了还能找回。
    const fingerprints: Record<string, { size: number; mtimeMs: number }> = {};
    for (const file of files) {
      const fingerprint = fresh.get(file) ?? meta.externalBounceFingerprints[file];
      if (fingerprint) fingerprints[file] = fingerprint;
    }
    store[projectId] = {
      ...meta,
      externalBounceFolders: dedupePaths(externalBounceFolders),
      externalBounceFiles: files,
      externalBounceFingerprints: fingerprints,
    };
    return store;
  });
}

// 给某项目加一个外部 bounce 文件（已登记过的不重复加）。Unmatched Bounces 里「只这一个文件」用。
export async function addExternalBounceFile(projectId: string, file: string): Promise<void> {
  const fingerprint = fingerprintOf(file);
  await updateStore((store) => {
    const meta = withDefaults(store[projectId]);
    if (meta.externalBounceFiles.includes(file)) return null;
    store[projectId] = {
      ...meta,
      externalBounceFiles: dedupePaths([...meta.externalBounceFiles, file]),
      externalBounceFingerprints: fingerprint
        ? { ...meta.externalBounceFingerprints, [file]: fingerprint }
        : meta.externalBounceFingerprints,
    };
    return store;
  });
}

// 把登记的外部文件路径换成找回后的新路径，指纹跟着挪过去并重新读一次；读不到的保留原来的指纹。
export async function replaceExternalBounceFiles(projectId: string, moves: Map<string, string>): Promise<void> {
  if (moves.size === 0) return;
  await updateStore((store) => {
    const meta = withDefaults(store[projectId]);
    const files: string[] = [];
    const fingerprints: Record<string, { size: number; mtimeMs: number }> = {};
    for (const original of meta.externalBounceFiles) {
      const file = moves.get(original) ?? original;
      files.push(file);
      const fingerprint = fingerprintOf(file) ?? meta.externalBounceFingerprints[original];
      if (fingerprint) fingerprints[file] = fingerprint;
    }
    store[projectId] = { ...meta, externalBounceFiles: files, externalBounceFingerprints: fingerprints };
    return store;
  });
}

// 覆盖式写入某项目的 bounce 别名（去空白；不区分大小写去重，保留第一次出现的写法）。
export async function setBounceAliases(projectId: string, aliases: string[]): Promise<void> {
  const seen = new Set<string>();
  const cleaned = aliases
    .map((alias) => alias.trim())
    .filter((alias) => {
      const key = alias.toLowerCase();
      if (alias === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  await updateStore((store) => {
    store[projectId] = { ...withDefaults(store[projectId]), bounceAliases: cleaned };
    return store;
  });
}

// 记一个改名前的名字。同名（不区分大小写）的旧记录换成新的时间；和当前名字相同时不记。
export async function addPreviousBounceName(projectId: string, name: string, before: number): Promise<void> {
  if (name === projectId) return;
  await updateStore((store) => {
    const meta = withDefaults(store[projectId]);
    const rest = meta.previousBounceNames.filter((previous) => previous.name.toLowerCase() !== name.toLowerCase());
    store[projectId] = { ...meta, previousBounceNames: [...rest, { name, before }] };
    return store;
  });
}

// 覆盖式写入改名前的名字（Manage External Bounce 里取消勾选时用）。
export async function setPreviousBounceNames(
  projectId: string,
  names: { name: string; before: number }[],
): Promise<void> {
  await updateStore((store) => {
    store[projectId] = { ...withDefaults(store[projectId]), previousBounceNames: names };
    return store;
  });
}

// 把共享文件夹里的一个文件标成「不属于这个项目」（Not This Project）。
export async function addExcludedSharedBounce(projectId: string, fileName: string): Promise<void> {
  await updateStore((store) => {
    const meta = withDefaults(store[projectId]);
    if (meta.excludedSharedBounces.includes(fileName)) return null;
    store[projectId] = { ...meta, excludedSharedBounces: [...meta.excludedSharedBounces, fileName] };
    return store;
  });
}

// 撤销上面的标记（在 Unmatched Bounces 里又把它指回这个项目时用）。
export async function removeExcludedSharedBounce(projectId: string, fileName: string): Promise<void> {
  await updateStore((store) => {
    const meta = withDefaults(store[projectId]);
    if (!meta.excludedSharedBounces.includes(fileName)) return null;
    store[projectId] = {
      ...meta,
      excludedSharedBounces: meta.excludedSharedBounces.filter((name) => name !== fileName),
    };
    return store;
  });
}

// 删除某项目的元数据（移到废纸篓时清理，避免重建同名项目复活旧标签）。
export async function deleteProjectMetadata(projectId: string): Promise<void> {
  await updateStore((store) => {
    if (!(projectId in store)) return null;
    delete store[projectId];
    return store;
  });
}

// 删除某个 Stage 后，清空所有引用它的项目的 stageId。
export async function removeStageEverywhere(stageId: string): Promise<void> {
  await updateStore((store) => {
    let changed = false;
    for (const id of Object.keys(store)) {
      if (store[id].stageId === stageId) {
        store[id] = { ...store[id], stageId: null };
        changed = true;
      }
    }
    return changed ? store : null;
  });
}

// 删除某个 Genre 后，从所有项目的 genreIds 里移除它。
export async function removeGenreEverywhere(genreId: string): Promise<void> {
  await updateStore((store) => {
    let changed = false;
    for (const id of Object.keys(store)) {
      if (store[id].genreIds?.includes(genreId)) {
        store[id] = { ...store[id], genreIds: store[id].genreIds.filter((g) => g !== genreId) };
        changed = true;
      }
    }
    return changed ? store : null;
  });
}

// 删除某个合集后，从所有项目的 collectionIds 里移除它。
export async function removeCollectionEverywhere(collectionId: string): Promise<void> {
  await updateStore((store) => {
    let changed = false;
    for (const id of Object.keys(store)) {
      if (store[id].collectionIds?.includes(collectionId)) {
        store[id] = { ...store[id], collectionIds: store[id].collectionIds.filter((c) => c !== collectionId) };
        changed = true;
      }
    }
    return changed ? store : null;
  });
}

// 项目文件夹改名后，把它的 metadata 从旧名字迁到新名字，避免丢失。
export async function renameProjectMetadata(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  await updateStore((store) => {
    const existing = store[oldId];
    if (!existing) return null;
    delete store[oldId];
    store[newId] = existing;
    return store;
  });
}

export async function setProjectPinned(projectId: string, pinned: boolean): Promise<void> {
  await updateStore((store) => {
    if (!pinned) {
      store[projectId] = { ...withDefaults(store[projectId]), pinned: false, pinOrder: null };
      return store;
    }
    const nextPinOrder =
      Object.values(store)
        .filter((metadata) => metadata.pinned)
        .reduce((maxOrder, metadata) => Math.max(maxOrder, metadata.pinOrder ?? 0), 0) + 1;
    store[projectId] = { ...withDefaults(store[projectId]), pinned: true, pinOrder: nextPinOrder };
    return store;
  });
}

export async function movePinnedProject(projectId: string, direction: "up" | "down"): Promise<void> {
  await updateStore((store) => {
    const pinnedProjects = Object.entries(store)
      .filter(([, metadata]) => metadata.pinned)
      .sort(([, a], [, b]) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER));

    const currentIndex = pinnedProjects.findIndex(([id]) => id === projectId);
    if (currentIndex === -1) return null;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= pinnedProjects.length) return null;

    const [currentEntry] = pinnedProjects.splice(currentIndex, 1);
    pinnedProjects.splice(targetIndex, 0, currentEntry);
    pinnedProjects.forEach(([id], index) => {
      store[id] = { ...store[id], pinOrder: index + 1 };
    });
    return store;
  });
}

// 批量把项目加入某个合集。没有元数据的项目用默认值补齐。
export async function addProjectsToCollection(projectIds: string[], collectionId: string): Promise<void> {
  await updateStore((store) => {
    let changed = false;
    for (const id of projectIds) {
      const meta = withDefaults(store[id]);
      if (meta.collectionIds.includes(collectionId)) continue;
      store[id] = { ...meta, collectionIds: [...meta.collectionIds, collectionId] };
      changed = true;
    }
    return changed ? store : null;
  });
}

/** 批量设定某个 Stage 的项目：projectIds 里的项目设为这个 Stage（原来是别的 Stage 的会被改过来）；
 *  candidates 里没勾选、原来是这个 Stage 的清空。candidates 以外的数据（如已移除项目的残留）不动。 */
export async function setStageMembers(stageId: string, projectIds: string[], candidates: string[]): Promise<void> {
  const selected = new Set(projectIds);
  await updateStore((store) => {
    let changed = false;
    for (const id of candidates) {
      const meta = withDefaults(store[id]);
      const next = selected.has(id) ? stageId : meta.stageId === stageId ? null : meta.stageId;
      if (next === meta.stageId) continue;
      store[id] = { ...meta, stageId: next };
      changed = true;
    }
    return changed ? store : null;
  });
}

/** 批量设定某个 Genre 的项目：勾选的加上，candidates 里没勾选的去掉，其余 Genre 不受影响。 */
export async function setGenreMembers(genreId: string, projectIds: string[], candidates: string[]): Promise<void> {
  const selected = new Set(projectIds);
  await updateStore((store) => {
    let changed = false;
    for (const id of candidates) {
      const meta = withDefaults(store[id]);
      const has = meta.genreIds.includes(genreId);
      const want = selected.has(id);
      if (has === want) continue;
      store[id] = {
        ...meta,
        genreIds: want ? [...meta.genreIds, genreId] : meta.genreIds.filter((g) => g !== genreId),
      };
      changed = true;
    }
    return changed ? store : null;
  });
}
