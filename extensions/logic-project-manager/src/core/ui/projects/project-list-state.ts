import type { Project } from "@/core/projects/types";
import { sameFsFields, serializeProjectList } from "@/core/projects/list-cache";

/** 静默启动刷新时，内容没变就不提交，保留原引用，不触发重渲染。 */
export function shouldCommitProjects(silentStartup: boolean, updated: Project[], prev: Project[]): boolean {
  return !(silentStartup && serializeProjectList(updated) === serializeProjectList(prev));
}

/** 静默启动刷新时，磁盘上的项目有变化才显示加载。 */
export function shouldShowLoadingOnScan(silentStartup: boolean, base: Project[], current: Project[]): boolean {
  return silentStartup && !sameFsFields(base, current);
}

/** 列表刷新完就写缓存；加载中不写，刚读出来的那份也不重复写。 */
export function shouldWriteListCache(
  isLoading: boolean,
  projects: Project[],
  lastWritten: Project[] | undefined,
): boolean {
  return !isLoading && projects !== lastWritten;
}
