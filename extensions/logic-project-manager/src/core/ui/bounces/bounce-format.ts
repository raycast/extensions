import path from "node:path";
import { strings } from "@/strings";
import type { Group } from "@/core/ui/shared/grouping";

// bounce 的来源分组：项目里的 Bounces 文件夹、共享文件夹、外部来源，以及共享文件夹里没对上项目的。
export type BounceSourceKind = "project" | "shared" | "external" | "unmatched";

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// 拆出文件名主体与后缀：后缀在列表里用 subtitle 以次级灰显示。
export function splitExt(name: string): { stem: string; ext: string } {
  const ext = path.extname(name);
  return { stem: ext ? name.slice(0, -ext.length) : name, ext };
}

export function sourceGroupTitle(kind: BounceSourceKind): string {
  if (kind === "project") return strings.sourceProjectFolder;
  if (kind === "shared") return strings.sourceSharedFolder;
  if (kind === "external") return strings.sourceExternal;
  return strings.unmatchedBounces;
}

// 按来源分段：只保留非空段，段内顺序由调用方给的 sort 决定。
export function groupBySource<T>(
  items: T[],
  kinds: BounceSourceKind[],
  kindOf: (item: T) => BounceSourceKind | null,
  sort: (items: T[]) => T[],
): Group<T>[] {
  return kinds
    .map((kind) => {
      const list = sort(items.filter((item) => kindOf(item) === kind));
      return { key: kind, title: sourceGroupTitle(kind), subtitle: String(list.length), items: list };
    })
    .filter((group) => group.items.length > 0);
}
