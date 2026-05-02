import type { Item } from "$lib/types";

export function isNavigableDirectory(item: Item): boolean {
  return item.type === "directory" && !item.isPackageLike && !item.isMountRoot;
}
