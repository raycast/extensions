import type { DawSet, ProjectFileMetadata } from "@/daws";
import type { Project } from "@/core/projects/types";
import { runBatched } from "@/core/projects/run-batched";

// 每个项目的 current Set 和它的元数据；还没读完时 metadata 为 null。
export type CurrentSetInfo = { set: DawSet; metadata: ProjectFileMetadata | null };

// 同时读几个项目的 Set 列表：每个项目都要扫一次磁盘，曲库大时不能一口气读完。
const SET_LIST_CONCURRENCY = 3;

/** 把列表分成「有缓存、立刻显示」和「要后台解析」两份。
 *  每个项目都要读一次磁盘，所以分批读；结果按原顺序放回，进度提示和列表才对得上。 */
export async function planCurrentSetReads(
  list: Project[],
  listSets: (project: Project) => DawSet[],
  findSet: (sets: DawSet[]) => DawSet | null,
  cachedOf: (set: DawSet) => ProjectFileMetadata | null,
  isCancelled: () => boolean,
): Promise<{ initial: Record<string, CurrentSetInfo>; missing: [string, DawSet][] }> {
  const found: (CurrentSetInfo | null)[] = list.map(() => null);
  await runBatched(
    list.map((project, index) => ({ project, index })),
    async ({ project, index }) => {
      const set = findSet(listSets(project));
      if (!set) return;
      found[index] = { set, metadata: cachedOf(set) };
    },
    { concurrency: SET_LIST_CONCURRENCY, isCancelled },
  );

  const initial: Record<string, CurrentSetInfo> = {};
  const missing: [string, DawSet][] = [];
  for (const [index, project] of list.entries()) {
    const info = found[index];
    if (!info) continue;
    initial[project.id] = info;
    if (!info.metadata) missing.push([project.id, info.set]);
  }
  return { initial, missing };
}

/** 写入一条读好的元数据。期间项目的 current Set 换了（又存了一个）就原样返回，等下一轮。 */
export function applySetMetadata(
  prev: Record<string, CurrentSetInfo>,
  id: string,
  set: DawSet,
  metadata: ProjectFileMetadata,
): Record<string, CurrentSetInfo> {
  return prev[id]?.set.path === set.path ? { ...prev, [id]: { set, metadata } } : prev;
}

/** 要读的 Set 少于这个数时不弹进度提示（如在 DAW 里刚存了一个 Set），免得一闪而过。 */
export const SET_PROGRESS_MIN = 5;

/** 要不要弹进度提示：数量够多，而且没在播放（免得盖住播放提示）。 */
export function shouldShowSetProgress(missingCount: number, playbackToastActive: boolean): boolean {
  return missingCount >= SET_PROGRESS_MIN && !playbackToastActive;
}
