import { environment, LocalStorage } from "@raycast/api";
import { loadCatalog } from "../icons/catalog-loader";
import { readCopySvg } from "../icons/catalog-store";
import { pinsPath, readPins } from "../icons/pins-file";
import { SavedKeywords } from "../icons/search";
import { bestIcons, FoundIcon, foundIcon, perLibrary } from "../icons/tool-search";
import { CoreLibraryId } from "../icons/types";

type Input = {
  /**
   * What the icon should show or mean, in plain words. Several comma-separated keywords work best, most
   * likely first, for example "smile, happy face, emoji" or "trash, delete, bin".
   */
  query: string;
  /**
   * Which icon library to search: "lucide" or "hugeicons". Leave it out to search both.
   */
  library?: CoreLibraryId;
  /**
   * How many icons to return from each library, from 1 to 10. Defaults to 5.
   */
  limit?: number;
};

async function savedKeywords(library: CoreLibraryId): Promise<SavedKeywords> {
  try {
    const raw = await LocalStorage.getItem<string>(`keywords:${library}`);
    return raw ? (JSON.parse(raw) as SavedKeywords) : {};
  } catch {
    return {};
  }
}

/**
 * Finds icons in the free Lucide and Hugeicons icon libraries by name or meaning. Returns each icon's
 * library, name, import name, React code, SVG, and web page, best match first.
 */
export default async function tool(input: Input): Promise<FoundIcon[]> {
  const libraries: CoreLibraryId[] = input.library ? [input.library] : ["lucide", "hugeicons"];
  const count = perLibrary(input.limit);
  const found: FoundIcon[] = [];
  for (const library of libraries) {
    const catalog = await loadCatalog(library);
    const favorites = readPins(pinsPath(environment.supportPath), library);
    const icons = bestIcons(
      { library, icons: catalog.icons, saved: await savedKeywords(library), favorites },
      input.query,
      count,
    );
    for (const icon of icons) found.push(foundIcon(library, icon, readCopySvg(environment.supportPath, library, icon)));
  }
  return found;
}
