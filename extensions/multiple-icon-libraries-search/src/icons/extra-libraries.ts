// Libraries beyond Lucide and Hugeicons. The Store build has none.

import type { ExtraLibrary } from "./catalog-files";

export type ExtraLibraryId = never;

export const EXTRA_LIBRARY_IDS: ExtraLibraryId[] = [];

export const EXTRA_LIBRARIES: Record<ExtraLibraryId, ExtraLibrary> = {};

/** One of the libraries above, by id. */
export function extraLibrary(id: string): ExtraLibrary {
  const library = (EXTRA_LIBRARIES as Record<string, ExtraLibrary | undefined>)[id];
  if (!library) throw new Error(`Unknown icon library: ${id}`);
  return library;
}
