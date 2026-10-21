import { Action, ActionPanel, Icon } from "@raycast/api";
import { useState } from "react";
import { readCachedChoice, viewPrefs } from "./view-prefs";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";

const t = getTranslations(getSettings().language);

export type GroupOption = "created" | "modified" | "none";
export type GroupDateOption = "created" | "modified";

export function isGroupOption(value: string): value is GroupOption {
  return value === "created" || value === "modified" || value === "none";
}

// 读取/持久化某界面的分组选择（同步读，首帧即为记住的值）。
export function useGroupOption(storageKey: string, fallback: GroupOption) {
  const [groupBy, setGroupByState] = useState<GroupOption>(() => readCachedChoice(storageKey, isGroupOption, fallback));

  const setGroupBy = (next: GroupOption) => {
    setGroupByState(next);
    viewPrefs.set(storageKey, next);
  };

  return [groupBy, setGroupBy] as const;
}

// 月份段标题，如「September」。
function monthTitle(date: Date): string {
  return date.toLocaleString("en-US", { month: "long" });
}

// 年份段标题，如「2025」。
function yearTitle(date: Date): string {
  return String(date.getFullYear());
}

export type Group<T> = { key: string; title: string; subtitle: string; items: T[] };

// 把（已排序的）items 按分组维度分段。none 返回单段，标题用调用方给的 noneTitle（通常是排序名）。
// 日期分组采用 Finder 风格的动态段：今天 / 昨天 / 过去 7 天 / 过去 30 天 / 今年各月 / 往年各年，
// 只保留非空段，并按各段内最新时间从新到旧排列。
export function groupItems<T>(
  items: T[],
  groupBy: GroupOption,
  getDate: (item: T) => { created: number; modified: number },
  noneTitle: string,
): Group<T>[] {
  if (groupBy === "none") {
    return [{ key: "all", title: noneTitle, subtitle: String(items.length), items }];
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  // 固定窗口用日历天相减（new Date(y, m, d - n)），有夏令时的时区不会在切换当天差一小时；
  // 无夏令时的时区则与固定 24 小时窗口完全一致。
  const startOfToday = new Date(y, m, d).getTime();
  const startOfYesterday = new Date(y, m, d - 1).getTime();
  const startOfPrev7 = new Date(y, m, d - 7).getTime();
  const startOfPrev30 = new Date(y, m, d - 30).getTime();
  const startOfYear = new Date(y, 0, 1).getTime();

  function bandFor(ms: number): { key: string; title: string } {
    if (ms >= startOfToday) return { key: "today", title: t.bandToday };
    if (ms >= startOfYesterday) return { key: "yesterday", title: t.bandYesterday };
    if (ms >= startOfPrev7) return { key: "prev7", title: t.bandPrev7Days };
    if (ms >= startOfPrev30) return { key: "prev30", title: t.bandPrev30Days };
    const date = new Date(ms);
    if (ms >= startOfYear) return { key: `month-${date.getMonth()}`, title: monthTitle(date) };
    return { key: `year-${date.getFullYear()}`, title: yearTitle(date) };
  }

  const buckets = new Map<string, { title: string; max: number; items: T[] }>();
  for (const item of items) {
    const ms = groupBy === "created" ? getDate(item).created : getDate(item).modified;
    const band = bandFor(ms);
    const bucket = buckets.get(band.key);
    if (bucket) {
      bucket.items.push(item);
      if (ms > bucket.max) bucket.max = ms;
    } else {
      buckets.set(band.key, { title: band.title, max: ms, items: [item] });
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1].max - a[1].max)
    .map(([key, bucket]) => ({
      key,
      title: bucket.title,
      subtitle: String(bucket.items.length),
      items: bucket.items,
    }));
}

// 分组子菜单：按 allowed 顺序渲染日期维度，None 固定放最后，当前项打勾。
export function GroupBySubmenu(props: {
  allowed: GroupDateOption[];
  value: GroupOption;
  onChange: (next: GroupOption) => void;
}) {
  const labels: Record<GroupDateOption, string> = {
    created: t.groupByCreated,
    modified: t.groupByModified,
  };
  return (
    <ActionPanel.Submenu title={t.groupBy} icon={Icon.List}>
      {props.allowed.map((option) => (
        <Action
          key={option}
          title={labels[option]}
          icon={props.value === option ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(option)}
        />
      ))}
      <Action
        title={t.groupNone}
        icon={props.value === "none" ? Icon.CheckCircle : Icon.Circle}
        onAction={() => props.onChange("none")}
      />
    </ActionPanel.Submenu>
  );
}
