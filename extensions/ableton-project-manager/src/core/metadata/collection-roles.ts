import { assertPrefixWritable, listKeySuffixes, readJson, removeJson, updateJson } from "@/core/fs/storage";

const KEY_PREFIX = "collection-roles:";

/** 每个 collection 存一张 { 项目id -> 角色 } 映射；角色只在该 collection 内生效 */
export type RoleMap = Record<string, string>;

// 只保留非空字符串角色。
function parseRoleMap(value: unknown): RoleMap {
  if (!value || typeof value !== "object") return {};
  const out: RoleMap = {};
  for (const [id, role] of Object.entries(value as Record<string, unknown>)) {
    if (typeof role === "string" && role.trim() !== "") out[id] = role;
  }
  return out;
}

const emptyMap = (): RoleMap => ({});

function updateRoleMap(collectionId: string, update: (map: RoleMap) => RoleMap | null): Promise<RoleMap> {
  return updateJson(KEY_PREFIX + collectionId, parseRoleMap, emptyMap, update);
}

// 对每个合集的角色映射做同一种修改（Role 改名 / 删除、项目删除 / 改名时同步）。
async function updateAllRoleMaps(update: (map: RoleMap) => RoleMap | null): Promise<void> {
  for (const collectionId of await listKeySuffixes(KEY_PREFIX)) {
    await updateRoleMap(collectionId, update);
  }
}

/** 预检：所有合集的角色映射都能写（有损坏的就抛 StorageUnreadableError）。 */
export function assertRolesWritable(): Promise<void> {
  return assertPrefixWritable(KEY_PREFIX);
}

/** 读取某个 collection 的角色映射 */
export function getRoleMap(collectionId: string): Promise<RoleMap> {
  return readJson(KEY_PREFIX + collectionId, parseRoleMap, emptyMap);
}

/** 保存某个 collection 的角色映射（整张覆盖） */
export async function setRoleMap(collectionId: string, map: RoleMap): Promise<void> {
  await updateRoleMap(collectionId, () => map);
}

/** 删除某个 collection 的角色映射（合集被删时清理） */
export async function removeRoleMap(collectionId: string): Promise<void> {
  await removeJson(KEY_PREFIX + collectionId);
}

/** 从所有 collection 的角色映射里移除某项目（项目被删时清理） */
export async function removeProjectFromAllRoles(projectId: string): Promise<void> {
  await updateAllRoleMaps((map) => {
    if (!(projectId in map)) return null;
    delete map[projectId];
    return map;
  });
}

/** 把所有 collection 角色映射里的 oldId 改成 newId（项目改名时迁移，保留原角色） */
export async function renameProjectInAllRoles(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  await updateAllRoleMaps((map) => {
    if (!(oldId in map)) return null;
    // newId 下若有残留（同名旧项目的孤儿数据），以迁移过来的值为准。
    map[newId] = map[oldId];
    delete map[oldId];
    return map;
  });
}

/** 收集某项目在各 collection 里的角色 { collectionId -> 角色 }（删项目时存档用） */
export async function getProjectRoles(projectId: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const collectionId of await listKeySuffixes(KEY_PREFIX)) {
    const map = await getRoleMap(collectionId);
    if (projectId in map) out[collectionId] = map[projectId];
  }
  return out;
}

/** 从废纸篓放回时还原角色：已有角色就不动。 */
export async function restoreRole(collectionId: string, projectId: string, role: string): Promise<void> {
  await updateRoleMap(collectionId, (map) => (projectId in map ? null : assignRole(map, projectId, role)));
}

/** 给某项目设角色；返回新映射 */
export function assignRole(map: RoleMap, id: string, role: string): RoleMap {
  return { ...map, [id]: role };
}

/** 清掉某项目的角色；返回新映射 */
export function clearRole(map: RoleMap, id: string): RoleMap {
  const next = { ...map };
  delete next[id];
  return next;
}

/** 把所有 collection 里值为 oldName 的角色改成 newName（Role 重命名时同步） */
export async function renameRoleEverywhere(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return;
  await updateAllRoleMaps((map) => {
    let changed = false;
    for (const [id, role] of Object.entries(map)) {
      if (role === oldName) {
        map[id] = newName;
        changed = true;
      }
    }
    return changed ? map : null;
  });
}

/** 从所有 collection 里移除值为 name 的角色（Role 删除时同步） */
export async function deleteRoleEverywhere(name: string): Promise<void> {
  await updateAllRoleMaps((map) => {
    let changed = false;
    for (const [id, role] of Object.entries(map)) {
      if (role === name) {
        delete map[id];
        changed = true;
      }
    }
    return changed ? map : null;
  });
}

/** 所有合集里用到某个角色的曲目数（删除 Role 前提示用）。 */
export async function countRoleUsage(name: string): Promise<number> {
  let count = 0;
  for (const collectionId of await listKeySuffixes(KEY_PREFIX)) {
    const map = await getRoleMap(collectionId);
    count += Object.values(map).filter((role) => role === name).length;
  }
  return count;
}
