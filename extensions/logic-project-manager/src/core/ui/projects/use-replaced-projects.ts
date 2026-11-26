import { useCallback } from "react";
import { usePromise } from "@raycast/utils";
import type { Project } from "@/core/projects/types";
import { replacedProjectIds } from "@/core/fs/deleted-projects";

/** 有同名旧项目设置可找回的项目 id。项目列表变化时重读；渲染路径不读存储。 */
export function useReplacedProjects(projects: Project[]): { ids: Set<string>; revalidate: () => void } {
  const { data, revalidate } = usePromise(replacedProjectIds, [projects]);
  const reload = useCallback(() => void revalidate(), [revalidate]);
  return { ids: new Set(data ?? []), revalidate: reload };
}
