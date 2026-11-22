import { strings } from "@/strings";

export type SortOption =
  | "modified-desc"
  | "modified-asc"
  | "created-desc"
  | "created-asc"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc";

type SortOptionDef = { value: SortOption; title: string };

// 全部可用选项及其显示文案。每个界面从中挑自己要的子集(通过 allowed 传入)。
export const ALL_SORT_OPTIONS: SortOptionDef[] = [
  { value: "modified-desc", title: strings.modifiedNewest },
  { value: "modified-asc", title: strings.modifiedOldest },
  { value: "created-desc", title: strings.createdNewest },
  { value: "created-asc", title: strings.createdOldest },
  { value: "name-asc", title: strings.nameAZ },
  { value: "name-desc", title: strings.nameZA },
  { value: "size-desc", title: strings.sizeLargest },
  { value: "size-asc", title: strings.sizeSmallest },
];

export function isSortOption(value: string): value is SortOption {
  return ALL_SORT_OPTIONS.some((option) => option.value === value);
}

export function sortOptionTitle(value: SortOption): string {
  return ALL_SORT_OPTIONS.find((option) => option.value === value)?.title ?? "";
}

// 一个 item 用于排序的取值:创建/修改时间、名称,以及可选的大小。
export type SortKeys = {
  created: number;
  modified: number;
  name: string;
  size?: number;
};

export function sortItems<T>(items: T[], sortBy: SortOption, get: (item: T) => SortKeys): T[] {
  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

  return [...items].sort((a, b) => {
    const ka = get(a);
    const kb = get(b);

    switch (sortBy) {
      case "modified-desc":
        return kb.modified - ka.modified;
      case "modified-asc":
        return ka.modified - kb.modified;
      case "created-desc":
        return kb.created - ka.created;
      case "created-asc":
        return ka.created - kb.created;
      case "name-asc":
        return byName(ka.name, kb.name);
      case "name-desc":
        return byName(kb.name, ka.name);
      case "size-desc":
        return (kb.size ?? 0) - (ka.size ?? 0);
      case "size-asc":
        return (ka.size ?? 0) - (kb.size ?? 0);
    }
  });
}
