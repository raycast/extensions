import { Artifact } from "../types";
import { expandPath } from "../services/path-validation";

export const filters = {
  all: "All Results",
  gb: "Larger Than 1 GB",
  mb: "Larger Than 500 MB",
  days30: "Inactive More Than 30 Days",
  days90: "Inactive More Than 90 Days",
  days180: "Inactive More Than 180 Days",
  sensitive: "Sensitive",
  review: "Review",
  unknown: "Unknown Risk",
};
export type Filter = keyof typeof filters;
export const sorts = {
  largest: "Largest First",
  smallest: "Smallest First",
  oldest: "Oldest Activity First",
  newest: "Newest Activity First",
  path: "Path",
};
export type Sort = keyof typeof sorts;

export function formatSize(size: number | null): string {
  if (size === null) return "Unknown size";
  if (size === 0) return "0 B";
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 4);
  return `${Number((size / 1024 ** Math.max(0, index)).toFixed(1))} ${["B", "KB", "MB", "GB", "TB"][Math.max(0, index)]}`;
}

export function formatActivity(activity: number | null, now = Date.now()): string {
  if (activity === null) return "Unknown";
  if (activity > now) return "Future date";
  const days = Math.floor((now - activity) / 86_400_000);
  return days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function estimatedTotal(items: readonly { size: number | null }[]): string {
  const unknown = items.filter((item) => item.size === null).length;
  return `${formatSize(items.reduce((total, item) => total + (item.size ?? 0), 0))} estimated${unknown ? ` + ${unknown} unknown` : ""}`;
}

export function visibleArtifacts(
  items: Artifact[],
  search: string,
  filter: Filter,
  sort: Sort,
  now = Date.now(),
): Artifact[] {
  const query = expandPath(search.trim()).toLocaleLowerCase();
  const age = filter.startsWith("days") ? Number(filter.slice(4)) * 86_400_000 : 0;
  return items
    .filter((item) => {
      if (!item.path.toLocaleLowerCase().includes(query)) return false;
      if (age && (item.activity === null || now - item.activity <= age)) return false;
      if (filter === "gb" && (item.size === null || item.size <= 1024 ** 3)) return false;
      if (filter === "mb" && (item.size === null || item.size <= 500 * 1024 ** 2)) return false;
      if (["sensitive", "review", "unknown"].includes(filter) && item.risk !== filter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "path") return a.path.localeCompare(b.path);
      const x = sort === "largest" || sort === "smallest" ? a.size : a.activity;
      const y = sort === "largest" || sort === "smallest" ? b.size : b.activity;
      if (x === null) return y === null ? a.path.localeCompare(b.path) : 1;
      if (y === null) return -1;
      return (sort === "largest" || sort === "newest" ? y - x : x - y) || a.path.localeCompare(b.path);
    });
}

export function markdownText(value: string): string {
  return value.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&").replace(/\n/g, "  \n");
}
