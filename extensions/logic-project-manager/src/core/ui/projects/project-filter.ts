import type { ProjectFileMetadata } from "@/daws";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";
import type { Project } from "@/core/projects/types";
import { keyKeywords, keyToken } from "@/core/projects/musical-key";
import {
  bpmMatches,
  dateKeywords,
  matchesSearch,
  nameKeywords,
  optionKeywords,
  timeSignatureMatches,
} from "@/core/ui/shared/search-keywords";

// 项目搜索用到的标签和 current Set 元数据：由视图每次渲染时传入，函数本身不读任何状态。
export type ProjectSearchContext = {
  stageOptions: TaxonomyOption[];
  genreOptions: TaxonomyOption[];
  collectionOptions: TaxonomyOption[];
  currentSets: Record<string, { metadata: ProjectFileMetadata | null }>;
};

// 标签 id → 显示名，找不到的 id 跳过。
export function tagNames(ids: string[], options: TaxonomyOption[]): string[] {
  return ids
    .map((id) => options.find((option) => option.id === id)?.name)
    .filter((name): name is string => name !== undefined);
}

// 每个项目可被搜到的内容：标题、Stage、Genre、合集名的各种写法，加上创建年月。
export function projectSearchTerms(project: Project, context: ProjectSearchContext): string[] {
  const stage = context.stageOptions.find((option) => option.id === project.stageId);
  const genres = context.genreOptions.filter((option) => project.genreIds.includes(option.id));
  const collections = context.collectionOptions.filter((option) => project.collectionIds.includes(option.id));
  return [
    ...nameKeywords(project.title),
    ...(stage ? optionKeywords(stage) : []),
    ...genres.flatMap(optionKeywords),
    ...collections.flatMap(optionKeywords),
    ...dateKeywords(project.createdAt),
  ];
}

// current Set 的 Key 的各种写法。不放进 projectSearchTerms：组合搜索里 Key 要整词对上，
// 否则 cm（C 小调）会被当成 cmaj（C 大调）的一部分搜到。
export function projectKeyWords(project: Project, context: ProjectSearchContext): string[] {
  const key = context.currentSets[project.id]?.metadata?.key;
  return key ? [key, ...keyKeywords(key)] : [];
}

// 组合搜索：每个词都要命中。BPM、拍号、Key 整词对上，其余按文字比。
export function matchProject(project: Project, query: string, context: ProjectSearchContext): boolean {
  const keyTokens = new Set(projectKeyWords(project, context).map(keyToken));
  const bpm = context.currentSets[project.id]?.metadata?.bpm ?? null;
  const timeSignature = context.currentSets[project.id]?.metadata?.timeSignature ?? null;
  return matchesSearch(
    projectSearchTerms(project, context),
    query,
    (word) =>
      bpmMatches(bpm, word) ??
      timeSignatureMatches(timeSignature, word) ??
      (keyTokens.has(keyToken(word)) ? true : undefined),
  );
}

// 以 # 开头时用组合搜索（每个词都要命中）；否则交给 Raycast 的模糊搜索。
export function parseTagSearch(text: string): { isTagSearch: boolean; isEmptyTagSearch: boolean; query: string } {
  const trimmed = text.trimStart();
  const isTagSearch = trimmed.startsWith("#");
  const query = isTagSearch ? trimmed.slice(1) : "";
  return { isTagSearch, isEmptyTagSearch: isTagSearch && query.trim() === "", query };
}

// 下拉筛选：all、stage:<id>、genre:<id>、created:<year>。
export function filterByDropdown(projects: Project[], selectedFilter: string): Project[] {
  if (selectedFilter === "all") return projects;
  const separator = selectedFilter.indexOf(":");
  const dimension = selectedFilter.slice(0, separator);
  const id = selectedFilter.slice(separator + 1);
  if (dimension === "stage") return projects.filter((project) => project.stageId === id);
  if (dimension === "genre") return projects.filter((project) => project.genreIds.includes(id));
  if (dimension === "created")
    return projects.filter((project) => new Date(project.createdAt).getFullYear() === Number(id));
  return projects;
}

// 置顶的项目按 pinOrder 排在最前，其余留给调用方按当前排序规则排。
export function splitPinned(projects: Project[]): { pinned: Project[]; unpinned: Project[] } {
  return {
    pinned: projects
      .filter((project) => project.pinned)
      .sort((a, b) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER)),
    unpinned: projects.filter((project) => !project.pinned),
  };
}

// Filter 的 Created 分组只列出有项目的年份，新的在前。
export function createdYears(projects: Project[]): number[] {
  return [...new Set(projects.map((project) => new Date(project.createdAt).getFullYear()))].sort((a, b) => b - a);
}
