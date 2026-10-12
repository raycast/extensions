import type { Entry, Layer } from "./types";

export type SortOption = "title-asc" | "title-desc" | "key-asc" | "key-desc";

export const SORT_OPTIONS: { value: SortOption; title: string }[] = [
  { value: "title-asc", title: "Title A-Z" },
  { value: "title-desc", title: "Title Z-A" },
  { value: "key-asc", title: "Key A-Z" },
  { value: "key-desc", title: "Key Z-A" },
];

export function sortEntries(entries: Entry[], sort: SortOption): Entry[] {
  const sorted = [...entries];
  const direction = sort.endsWith("desc") ? -1 : 1;
  if (sort.startsWith("title")) {
    sorted.sort((a, b) => direction * a.title.localeCompare(b.title));
  } else {
    sorted.sort((a, b) => direction * a.key.localeCompare(b.key));
  }
  return sorted;
}

export type LayerSortOption = "name-asc" | "name-desc";

export const LAYER_SORT_OPTIONS: { value: LayerSortOption; title: string }[] = [
  { value: "name-asc", title: "Name A-Z" },
  { value: "name-desc", title: "Name Z-A" },
];

export function sortLayers(layers: Layer[], sort: LayerSortOption): Layer[] {
  const direction = sort === "name-desc" ? -1 : 1;
  return [...layers].sort((a, b) => direction * a.name.localeCompare(b.name));
}
