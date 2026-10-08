import { DriveNode } from "./cli";

export type SortOrder = "name" | "modified" | "size";

export const SORT_ORDERS: { value: SortOrder; title: string }[] = [
  { value: "name", title: "Name" },
  { value: "modified", title: "Date Modified" },
  { value: "size", title: "Size" },
];

/** Natural order: "2. SASU" after "1. EI", "10" after "9", case and accents ignored. */
const byName = (a: DriveNode, b: DriveNode) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

/**
 * Folders first, then files, each group in the chosen order. Newest and largest come first.
 * The CLI gives no folder sizes: `folderSizes` (from the search index) provides them when it exists;
 * without it, folders keep their name order when sorting by size.
 */
export function sortNodes(nodes: DriveNode[], order: SortOrder, folderSizes?: Map<string, number>): DriveNode[] {
  const size = (n: DriveNode) => (n.type === "folder" ? (folderSizes?.get(n.path) ?? 0) : (n.size ?? 0));
  const key = (n: DriveNode): number =>
    order === "modified" ? (n.modified ? Date.parse(n.modified) : 0) : order === "size" ? size(n) : 0;
  return [...nodes].sort(
    (a, b) =>
      Number(b.type === "folder") - Number(a.type === "folder") ||
      (order === "name" ? 0 : key(b) - key(a)) ||
      byName(a, b),
  );
}
