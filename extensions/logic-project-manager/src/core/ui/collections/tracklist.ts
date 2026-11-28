import type { Project } from "@/core/projects/types";
import type { TrackMap } from "@/core/metadata/collection-order";
import { energyLevelFromScore, energyScore, type EnergyRange, type TrackInfo } from "@/core/projects/track-info";

// 时长显示：不足一小时用 m:ss（分钟位宽可调），超过一小时用 h:mm:ss。
export function formatDuration(totalSeconds: number, minuteDigits = 1): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(minuteDigits, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 合集名比较：忽略首尾空格与大小写。
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Tracklist 按轨号排，同号按标题；没有轨号的进 Unsorted，按标题排。
export function splitTracklist(members: Project[], map: TrackMap): { tracked: Project[]; unsorted: Project[] } {
  return {
    tracked: members
      .filter((p) => map[p.id] !== undefined)
      .sort((a, b) => map[a.id] - map[b.id] || a.title.localeCompare(b.title)),
    unsorted: members.filter((p) => map[p.id] === undefined).sort((a, b) => a.title.localeCompare(b.title)),
  };
}

// 每个号被几首占用，用于撞号高亮。
export function numberCounts(tracked: Project[], map: TrackMap): Map<number, number> {
  const counts = new Map<number, number>();
  for (const p of tracked) counts.set(map[p.id], (counts.get(map[p.id]) ?? 0) + 1);
  return counts;
}

// 能量定档的尺：对已排序曲目的各特征分别取 min/max；没有数据时都是 0。
export function energyRanges(
  tracked: Project[],
  infos: Record<string, TrackInfo>,
): { crest: EnergyRange; brightness: EnergyRange; activity: EnergyRange } {
  const range = (pick: (info: TrackInfo) => number | null): EnergyRange => {
    const values = tracked.map((p) => infos[p.id]).filter((info): info is TrackInfo => info !== undefined);
    const picked = values.map(pick).filter((v): v is number => typeof v === "number");
    return { min: picked.length ? Math.min(...picked) : 0, max: picked.length ? Math.max(...picked) : 0 };
  };
  return {
    crest: range((info) => info.crest),
    brightness: range((info) => info.brightness),
    activity: range((info) => info.activity),
  };
}

// 总时长：所有已排序曲目（不分 Stage）。
export function totalDuration(tracked: Project[], infos: Record<string, TrackInfo>): number {
  return tracked.reduce((sum, p) => sum + (infos[p.id]?.duration ?? 0), 0);
}

// 分钟位宽：本合集任一曲目 ≥ 10 分钟则补两位，保证时长列对齐。
export function durationMinuteDigits(members: Project[], infos: Record<string, TrackInfo>): number {
  const longest = members.reduce((max, p) => Math.max(max, infos[p.id]?.duration ?? 0), 0);
  return longest >= 600 ? 2 : 1;
}

// 还没读到时长时的占位，宽度和真实时长一致。
export function durationPlaceholder(minuteDigits: number): string {
  return minuteDigits === 2 ? "--:--" : "-:--";
}

// 下拉筛选：all、stage:<id>、genre:<id>。
export function matchesFilter(project: Project, selectedFilter: string): boolean {
  if (selectedFilter === "all") return true;
  const separator = selectedFilter.indexOf(":");
  const dimension = selectedFilter.slice(0, separator);
  const id = selectedFilter.slice(separator + 1);
  if (dimension === "stage") return project.stageId === id;
  if (dimension === "genre") return project.genreIds.includes(id);
  return true;
}

// 已排序曲目的能量档位（以本合集已排序曲目为尺）；未排序或无数据 → null。
export function energyLevelOf(
  project: Project,
  map: TrackMap,
  infos: Record<string, TrackInfo>,
  ranges: { crest: EnergyRange; brightness: EnergyRange; activity: EnergyRange },
): number | null {
  const info = infos[project.id];
  if (map[project.id] === undefined || !info) return null;
  const score = energyScore(info, ranges.crest, ranges.brightness, ranges.activity);
  return score === null ? null : energyLevelFromScore(score);
}

// 还在分析的曲目数：顶部加载条和分区副标题的进度都用它。
export function analyzedCount(members: Project[], infos: Record<string, TrackInfo>): number {
  return members.filter((p) => p.id in infos).length;
}

/** 曲目分析的输入签名：只取 loadTrackInfo 从 Project 里读的 5 个字段。
 *  - title：匹配 Shared Bounces Folder 里的文件
 *  - folderPath：bounce 默认文件夹
 *  - kind：listSets 用它区分包和文件夹
 *  - externalBounceFolders / externalBounceFiles：外部来源
 *  笔记、歌词、标签、Stage 都不影响分析结果，不进签名。
 *
 *  磁盘上的变化（新导出的 bounce、新保存的 Set、文件被改）也不进签名，所以：
 *  - 面板打开期间新导出的 bounce、新保存的 Set 不会自动出现，要重开面板才读到。
 *  - 重开面板时一定读到：loadTrackInfo 每次都先实时扫磁盘（findLatestProjectBounce、
 *    daw.listSets），再按 mtime + size 比对缓存，新文件在缓存里没有，必然重新分析。
 *    缓存只跳过「文件没变」的情况，不会挡住新文件。 */
export function trackInfoSignature(members: Project[]): string {
  return members
    .map((p) => {
      const fields = [
        p.title,
        p.folderPath,
        p.kind,
        p.externalBounceFolders.join("\u0000"),
        p.externalBounceFiles.join("\u0000"),
      ];
      return fields.join("\u0001");
    })
    .join("\u0002");
}
