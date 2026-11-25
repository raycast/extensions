import { currentPlatformAdapter } from "../platforms";
import { IPlatformAdapter } from "../platforms/types";
import { PremiereFile, SortOption } from "../types";
import { createPremiereFile } from "./recents";

export function sortPremiereFiles(files: PremiereFile[], sortBy: SortOption): PremiereFile[] {
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

export function filterPremiereFiles(files: PremiereFile[], searchTerm: string): PremiereFile[] {
  const term = searchTerm.trim().toLowerCase();
  if (term.length === 0) return files;

  return files.filter((f) => {
    if (f.title.toLowerCase().includes(term)) return true;
    if (f.name.toLowerCase().includes(term)) return true;
    if (f.directoryName.toLowerCase().includes(term)) return true;
    if (f.productionName && f.productionName.toLowerCase().includes(term)) return true;
    if (f.sequences && f.sequences.some((seq) => seq.toLowerCase().includes(term))) return true;
    return false;
  });
}

export async function searchPremiereProjects(
  searchTerm = "",
  scope: "home" | "all" | string = "home",
  limit = 100,
  adapter: IPlatformAdapter = currentPlatformAdapter,
): Promise<PremiereFile[]> {
  try {
    const rawPaths = await adapter.searchProjectPaths(searchTerm, scope, limit);
    const hydrated = await Promise.all(rawPaths.map((p) => createPremiereFile(p)));
    return hydrated.filter((f): f is PremiereFile => f !== null && (f.extension === "prproj" || f.extension === "aep"));
  } catch {
    return [];
  }
}
