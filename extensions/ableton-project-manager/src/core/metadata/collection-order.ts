import { assertPrefixWritable, listKeySuffixes, readJson, removeJson, updateJson } from "@/core/fs/storage";

const KEY_PREFIX = "collection-order:";

/** 每个 collection 存一张 { 项目id -> 轨号 } 映射 */
export type TrackMap = Record<string, number>;

// 只保留合法轨号（有限数、>= 1，取整）。
function parseTrackMap(value: unknown): TrackMap {
  if (!value || typeof value !== "object") return {};
  const out: TrackMap = {};
  for (const [id, n] of Object.entries(value as Record<string, unknown>)) {
    if (typeof n === "number" && Number.isFinite(n) && n >= 1) out[id] = Math.floor(n);
  }
  return out;
}

const emptyMap = (): TrackMap => ({});

function updateTrackMap(collectionId: string, update: (map: TrackMap) => TrackMap | null): Promise<TrackMap> {
  return updateJson(KEY_PREFIX + collectionId, parseTrackMap, emptyMap, update);
}

/** 预检：所有合集的轨号映射都能写（有损坏的就抛 StorageUnreadableError）。 */
export function assertOrdersWritable(): Promise<void> {
  return assertPrefixWritable(KEY_PREFIX);
}

/** 读取某个 collection 的轨号映射 */
export function getTrackMap(collectionId: string): Promise<TrackMap> {
  return readJson(KEY_PREFIX + collectionId, parseTrackMap, emptyMap);
}

/** 保存某个 collection 的轨号映射（整张覆盖） */
export async function setTrackMap(collectionId: string, map: TrackMap): Promise<void> {
  await updateTrackMap(collectionId, () => map);
}

/** 删除某个 collection 的轨号映射（合集被删时清理） */
export async function removeTrackMap(collectionId: string): Promise<void> {
  await removeJson(KEY_PREFIX + collectionId);
}

/** 从所有 collection 的轨号映射里移除某项目（项目被删时清理） */
export async function removeProjectFromAllOrders(projectId: string): Promise<void> {
  for (const collectionId of await listKeySuffixes(KEY_PREFIX)) {
    await updateTrackMap(collectionId, (map) => {
      if (!(projectId in map)) return null;
      delete map[projectId];
      return map;
    });
  }
}

/** 把所有 collection 轨号映射里的 oldId 改成 newId（项目改名时迁移，保留原轨号） */
export async function renameProjectInAllOrders(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  for (const collectionId of await listKeySuffixes(KEY_PREFIX)) {
    await updateTrackMap(collectionId, (map) => {
      if (!(oldId in map)) return null;
      // newId 下若有残留（同名旧项目的孤儿数据），以迁移过来的值为准。
      map[newId] = map[oldId];
      delete map[oldId];
      return map;
    });
  }
}

/** 收集某项目在各 collection 里的轨号 { collectionId -> 轨号 }（删项目时存档用） */
export async function getProjectOrders(projectId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const collectionId of await listKeySuffixes(KEY_PREFIX)) {
    const map = await getTrackMap(collectionId);
    if (projectId in map) out[collectionId] = map[projectId];
  }
  return out;
}

/** 从废纸篓放回时还原轨号：已有轨号就不动；原轨号已被别的曲目占用就排到末尾，避免重号。 */
export async function restoreTrackNumber(collectionId: string, projectId: string, number: number): Promise<void> {
  await updateTrackMap(collectionId, (map) => {
    if (projectId in map) return null;
    const taken = Object.values(map).includes(number);
    return assignNumber(map, projectId, taken ? nextNumber(map) : number);
  });
}

/** 给某项目设轨号（n>=1）；返回新映射 */
export function assignNumber(map: TrackMap, id: string, n: number): TrackMap {
  return { ...map, [id]: Math.floor(n) };
}

/** 清掉某项目的轨号；返回新映射 */
export function removeNumber(map: TrackMap, id: string): TrackMap {
  const next = { ...map };
  delete next[id];
  return next;
}

/** 对调两个项目的轨号；返回新映射 */
export function swapNumbers(map: TrackMap, a: string, b: string): TrackMap {
  const next = { ...map };
  const tmp = next[a];
  next[a] = next[b];
  next[b] = tmp;
  return next;
}

/** 当前最大号 + 1（空则为 1） */
export function nextNumber(map: TrackMap): number {
  const values = Object.values(map);
  return values.length === 0 ? 1 : Math.max(...values) + 1;
}
