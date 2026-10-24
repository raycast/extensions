import os from "node:os";
import { PhotoshopFile, SortOption } from "../types";
import { createPhotoshopFileFast, runMdfind } from "../utils/spotlight";

export function sortPhotoshopFiles(files: PhotoshopFile[], sortBy: SortOption): PhotoshopFile[] {
  const list = [...files];
  switch (sortBy) {
    case "recent":
      return list;
    case "name-asc":
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
    case "name-desc":
      return list.sort((a, b) => b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: "base" }));
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

function escapeSpotlightQueryString(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function searchPhotoshopProjects(
  searchTerm = "",
  scope: "home" | "all" = "home",
  limit = 100,
): Promise<PhotoshopFile[]> {
  const scopePath = scope === "home" ? os.homedir() : undefined;
  const trimmed = searchTerm.trim();

  const baseTypeQuery =
    "(kMDItemContentType == 'com.adobe.photoshop-image' || kMDItemFSName == '*.psd'c || kMDItemFSName == '*.psb'c || kMDItemFSName == '*.psdt'c || kMDItemFSName == '*.pdd'c)";

  let query: string;
  if (trimmed.length === 0) {
    query = baseTypeQuery;
  } else {
    const escaped = escapeSpotlightQueryString(trimmed);
    query = `${baseTypeQuery} && (kMDItemFSName == '*${escaped}*'c || kMDItemDisplayName == '*${escaped}*'c || kMDItemLayerNames == '*${escaped}*'c || kMDItemPath == '*${escaped}*'c || kMDItemTextContent == '*${escaped}*'c)`;
  }

  const rawPaths = await runMdfind(query, scopePath, limit);
  const fastFiles: PhotoshopFile[] = [];

  for (const p of rawPaths) {
    const file = createPhotoshopFileFast(p);
    if (file) {
      fastFiles.push(file);
    }
  }

  return fastFiles;
}
