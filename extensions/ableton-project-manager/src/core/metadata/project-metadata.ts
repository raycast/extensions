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
};

function parseStore(value: unknown): ProjectMetadataStore {
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
function withDefaults(metadata: Partial<ProjectMetadata> | undefined): ProjectMetadata {
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

// 覆盖式写入某项目的外部 bounce 来源（去重、去空白）。随 ProjectMetadata 一起在改名/移动时迁移。
export async function setExternalBounces(
  projectId: string,
  externalBounceFolders: string[],
  externalBounceFiles: string[],
): Promise<void> {
  const dedupe = (paths: string[]) => Array.from(new Set(paths.map((p) => p.trim()).filter((p) => p !== "")));
  await updateStore((store) => {
    store[projectId] = {
      ...withDefaults(store[projectId]),
      externalBounceFolders: dedupe(externalBounceFolders),
      externalBounceFiles: dedupe(externalBounceFiles),
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
