// Loading a library's catalog inside Raycast, shared by the command and the AI tool.

import { environment, Icon } from "@raycast/api";
import { join } from "node:path";
import {
  CatalogSources,
  HUGEICONS_DATA_FILE,
  httpFetcher,
  isStale,
  readCatalog,
  refreshCatalog,
} from "./catalog-store";
import { Catalog, LibraryId } from "./types";

export function catalogSources(): CatalogSources {
  return {
    hugeiconsData: join(environment.assetsPath, HUGEICONS_DATA_FILE),
    // A library whose icons the extension SDK also offers names them the SDK's way (Icon.Bubble).
    extra: { sdkIcons: Icon as unknown as Record<string, string> },
  };
}

// One refresh per library at a time, shared by every view that asks.
const inFlight = new Map<LibraryId, Promise<Catalog>>();

export function startRefresh(library: LibraryId): Promise<Catalog> {
  const running = inFlight.get(library);
  if (running) return running;
  const promise = refreshCatalog(environment.supportPath, library, httpFetcher, Date.now(), catalogSources()).finally(
    () => inFlight.delete(library),
  );
  inFlight.set(library, promise);
  return promise;
}

/** The saved catalog, refreshed first when it is missing or a day old. Offline, a saved one still answers. */
export async function loadCatalog(library: LibraryId): Promise<Catalog> {
  const saved = readCatalog(environment.supportPath, library);
  if (saved && !isStale(saved, Date.now())) return saved;
  try {
    return await startRefresh(library);
  } catch (error) {
    if (saved) return saved;
    throw error;
  }
}
