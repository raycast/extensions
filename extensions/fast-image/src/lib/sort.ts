import { ImageFile, SortMode, UsageStats } from "../types";

export function sortImages(images: ImageFile[], mode: SortMode, usage: UsageStats): ImageFile[] {
  const sorted = [...images];

  switch (mode) {
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "date-added-desc":
      sorted.sort((a, b) => {
        const diff = (b.createdAtMs ?? b.mtimeMs) - (a.createdAtMs ?? a.mtimeMs);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "date-added-asc":
      sorted.sort((a, b) => {
        const diff = (a.createdAtMs ?? a.mtimeMs) - (b.createdAtMs ?? b.mtimeMs);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "date-modified-desc":
      sorted.sort((a, b) => {
        const diff = b.mtimeMs - a.mtimeMs;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "date-modified-asc":
      sorted.sort((a, b) => {
        const diff = a.mtimeMs - b.mtimeMs;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "size-desc":
      sorted.sort((a, b) => {
        const diff = b.size - a.size;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "size-asc":
      sorted.sort((a, b) => {
        const diff = a.size - b.size;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "recent":
      sorted.sort((a, b) => {
        const diff = (usage[b.path]?.lastUsedAt ?? 0) - (usage[a.path]?.lastUsedAt ?? 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    case "frequent":
      sorted.sort((a, b) => {
        const diff = (usage[b.path]?.count ?? 0) - (usage[a.path]?.count ?? 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
  }

  return sorted;
}
