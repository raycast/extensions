import { normaliseTagName } from "$lib/ray-fb";
import { finderTagKey } from "./finder-tags";
import type { Item } from "$lib/types";

export function filterItemsWithTag(items: Item[], tagName: string): Item[] {
  const normalised = normaliseTagName(tagName);
  if (!normalised) return items;
  const key = finderTagKey(normalised);
  return items.filter((item) => item.userTags.some((tag) => finderTagKey(tag.name) === key));
}
