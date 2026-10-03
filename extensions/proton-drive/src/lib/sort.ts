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
 * Folders have no size, so "size" keeps them by name.
 */
export function sortNodes(nodes: DriveNode[], order: SortOrder): DriveNode[] {
  const key = (n: DriveNode): number =>
    order === "modified" ? (n.modified ? Date.parse(n.modified) : 0) : order === "size" ? (n.size ?? 0) : 0;
  return [...nodes].sort(
    (a, b) =>
      Number(b.type === "folder") - Number(a.type === "folder") ||
      (order === "name" ? 0 : key(b) - key(a)) ||
      byName(a, b),
  );
}
