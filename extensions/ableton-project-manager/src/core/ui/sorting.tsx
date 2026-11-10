import { Action, ActionPanel, Icon } from "@raycast/api";
import { useState } from "react";
import { readCachedChoice, viewPrefs } from "./view-prefs";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";

const t = getTranslations(getSettings().language);

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
const ALL_SORT_OPTIONS: SortOptionDef[] = [
  { value: "modified-desc", title: t.modifiedNewest },
  { value: "modified-asc", title: t.modifiedOldest },
  { value: "created-desc", title: t.createdNewest },
  { value: "created-asc", title: t.createdOldest },
  { value: "name-asc", title: t.nameAZ },
  { value: "name-desc", title: t.nameZA },
  { value: "size-desc", title: t.sizeLargest },
  { value: "size-asc", title: t.sizeSmallest },
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

// 读取/持久化某个界面的排序选择（同步读，首帧即为记住的值）。
// allowed = 这个界面开放哪些选项；若存储里的值不在 allowed 内（或非法），回落到 fallback。
export function useSortOption(storageKey: string, allowed: SortOption[], fallback: SortOption) {
  const [sortBy, setSortByState] = useState<SortOption>(() =>
    readCachedChoice(
      storageKey,
      (value): value is SortOption => isSortOption(value) && allowed.includes(value),
      fallback,
    ),
  );

  const setSortBy = (next: SortOption) => {
    setSortByState(next);
    viewPrefs.set(storageKey, next);
  };

  return [sortBy, setSortBy] as const;
}

// 排序子菜单:只渲染 allowed 里的选项,当前项打勾。
export function SortBySubmenu(props: {
  allowed: SortOption[];
  value: SortOption;
  onChange: (next: SortOption) => void;
}) {
  const options = ALL_SORT_OPTIONS.filter((option) => props.allowed.includes(option.value));

  return (
    <ActionPanel.Submenu title={t.sortBy} icon={Icon.NumberList}>
      {options.map((option) => (
        <Action
          key={option.value}
          title={option.title}
          icon={props.value === option.value ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(option.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
