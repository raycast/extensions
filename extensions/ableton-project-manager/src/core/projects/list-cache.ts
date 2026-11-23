import { Cache } from "@raycast/api";
import type { Project } from "./types";

// 项目列表的冷启动缓存：先显示上次读到的列表，扫描完再替换。
// 只存列表本身；Set 元数据另有缓存（project-file-cache）。

const CACHE_VERSION = 1;
const cache = new Cache({ namespace: "project-list-cache" });

type ProjectListPayload = {
  version: number;
  projects: Project[];
};

function cacheKey(projectsRoot: string): string {
  return `project-list-v1:${projectsRoot}`;
}

export function serializeProjectList(projects: Project[]): string {
  const payload: ProjectListPayload = { version: CACHE_VERSION, projects };
  return JSON.stringify(payload);
}

/** 解析缓存内容。空、JSON 损坏、版本不对、projects 不是数组都返回 undefined。 */
export function parseProjectList(raw: string | undefined): Project[] | undefined {
  if (!raw) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof payload !== "object" || payload === null) return undefined;
  const { version, projects } = payload as Partial<ProjectListPayload>;
  if (version !== CACHE_VERSION) return undefined;
  if (!Array.isArray(projects)) return undefined;
  return projects as Project[];
}

// 文件系统字段：loadProjects 从磁盘读出来、applyMetadata 不会改写的那些。
// 这些字段变了，说明项目本身有变化（新增、删除、改名、内容更新），值得显示加载状态。
// 其余字段（stageId、genreIds、collectionIds、notes、lyrics、pinned、pinOrder、
// externalBounceFolders、externalBounceFiles、bouncesCount）由元数据套用，
// 缓存里可能比磁盘新，拿来比较会误判成「有变化」。id 用作对应键，不放进这里。
export const FS_FIELDS = ["title", "folderPath", "kind", "createdAt", "inode", "modifiedAt", "setsCount"] as const;

/** 两份列表在文件系统层面是否一致：id 集合相同，且每个项目的 FS_FIELDS 全部相等。顺序无关。 */
export function sameFsFields(base: Project[], cached: Project[]): boolean {
  if (base.length !== cached.length) return false;
  const byId = new Map(cached.map((project) => [project.id, project]));
  for (const project of base) {
    const other = byId.get(project.id);
    if (!other) return false;
    for (const field of FS_FIELDS) {
      if (project[field] !== other[field]) return false;
    }
  }
  return true;
}

export function readProjectListCache(projectsRoot: string): Project[] | undefined {
  return parseProjectList(cache.get(cacheKey(projectsRoot)));
}

/** 写缓存失败时静默忽略：缓存只是加速，不能影响列表显示。 */
export function writeProjectListCache(projectsRoot: string, projects: Project[]): void {
  try {
    cache.set(cacheKey(projectsRoot), serializeProjectList(projects));
  } catch {
    // 忽略
  }
}
