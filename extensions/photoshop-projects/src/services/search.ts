import os from "node:os";
import { PhotoshopFile, SortOption } from "../types";
import { createPhotoshopFile, runMdfind } from "../utils/spotlight";

export function sortPhotoshopFiles(files: PhotoshopFile[], sortBy: SortOption): PhotoshopFile[] {
  const list = [...files];
  switch (sortBy) {
    case "name-asc":
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
    case "name-desc":
      return list.sort((a, b) => b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: "base" }));
    case "recent":
      return list.sort((a, b) => {
        const timeA = (a.lastOpenedDate || a.lastModifiedDate).getTime();
        const timeB = (b.lastOpenedDate || b.lastModifiedDate).getTime();
        return timeB - timeA;
      });
    case "date-desc":
      return list.sort((a, b) => b.lastModifiedDate.getTime() - a.lastModifiedDate.getTime());
    case "date-asc":
      return list.sort((a, b) => a.lastModifiedDate.getTime() - b.lastModifiedDate.getTime());
    case "size-desc":
      return list.sort((a, b) => b.sizeInBytes - a.sizeInBytes);
    case "size-asc":
      return list.sort((a, b) => a.sizeInBytes - b.sizeInBytes);
    default:
      return list;
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function searchPhotoshopProjects(
  searchTerm = "",
  scope: "home" | "all" = "home",
  limit = 100,
): Promise<PhotoshopFile[]> {
  const scopePath = scope === "home" ? os.homedir() : undefined;
  const trimmed = searchTerm.trim();

  let query: string;
  const baseTypeQuery =
    "(kMDItemContentType == 'com.adobe.photoshop-image' || kMDItemFSName == '*.psd'c || kMDItemFSName == '*.psb'c || kMDItemFSName == '*.psdt'c || kMDItemFSName == '*.pdd'c)";

  if (trimmed.length === 0) {
    query = baseTypeQuery;
  } else {
    const escaped = trimmed.replace(/["\\]/g, "");
    query = `${baseTypeQuery} && (kMDItemFSName == '*${escaped}*'c || kMDItemDisplayName == '*${escaped}*'c || kMDItemLayerNames == '*${escaped}*'c)`;
  }

  const rawPaths = await runMdfind(query, scopePath, limit);
  const hydrated = await mapConcurrent(rawPaths, 8, (p) => createPhotoshopFile(p));

  return hydrated.filter((f): f is PhotoshopFile => f !== null);
}
