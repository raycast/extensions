import type { AppRow, Capabilities, Category, CategoryId } from "./types";

export const CATEGORIES: readonly Category[] = [
  { id: "all", title: "All", icon: "List" },
  { id: "gui", title: "GUI", icon: "AppWindow" },
  { id: "cpu", title: "CPU", icon: "Gauge" },
  { id: "mem", title: "Memory", icon: "MemoryChip" },
  { id: "net", title: "Network", icon: "Globe" },
  { id: "bg", title: "Background", icon: "Gear" },
];

/** 采集能力关掉的分类不出现（gui/net）。 */
export function visibleCategories(capabilities: Capabilities): Category[] {
  return CATEGORIES.filter(
    (category) => (category.id !== "gui" || capabilities.gui) && (category.id !== "net" || capabilities.net),
  );
}

export type SortKey = "mem" | "cpu" | "procs" | "net" | "down" | "up" | "name";
export type SortDir = "asc" | "desc";

/** 对齐 goose-monitor：cpu 按 CPU、net 按总速率、其余按内存，全部降序。 */
export function defaultSort(category: CategoryId): { key: SortKey; dir: SortDir } {
  if (category === "cpu") return { key: "cpu", dir: "desc" };
  if (category === "net") return { key: "net", dir: "desc" };
  return { key: "mem", dir: "desc" };
}

const sortValue = (row: AppRow, key: Exclude<SortKey, "name">): number => {
  switch (key) {
    case "cpu":
      return row.cpu;
    case "procs":
      return row.procs;
    case "net":
      return (row.netDown ?? 0) + (row.netUp ?? 0);
    case "down":
      return row.netDown ?? 0;
    case "up":
      return row.netUp ?? 0;
    case "mem":
      return row.memBytes;
  }
};

/** 纯排序：数值键比较数值，name 比字符串；同值按名称稳定收敛。 */
export function sortRows(rows: readonly AppRow[], key: SortKey, dir: SortDir = "desc"): AppRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const compare =
    key === "name"
      ? (a: AppRow, b: AppRow) => a.name.localeCompare(b.name)
      : (a: AppRow, b: AppRow) => sortValue(a, key) - sortValue(b, key);
  return [...rows].sort((a, b) => sign * compare(a, b) || a.name.localeCompare(b.name));
}

export function filterRows(rows: readonly AppRow[], category: CategoryId): AppRow[] {
  switch (category) {
    case "gui":
      return rows.filter((row) => row.hasWindow);
    case "net":
      return rows.filter((row) => row.netDown !== undefined || row.netUp !== undefined);
    case "bg":
      return rows.filter((row) => row.kind === "bg");
    default:
      return [...rows];
  }
}

/** 分类 = 过滤 + 该分类的默认排序。 */
export function applyCategory(rows: readonly AppRow[], category: CategoryId): AppRow[] {
  const { key, dir } = defaultSort(category);
  return sortRows(filterRows(rows, category), key, dir);
}
