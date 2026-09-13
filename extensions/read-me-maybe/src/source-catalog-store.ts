import { LocalStorage } from "@raycast/api";

import {
  idsAreUnique,
  parseSourceCatalog,
  seedSource,
  sourceCatalogVersion,
  validateSourceRow,
  type SourceCatalog,
  type StoredSource,
} from "./domain/source-catalog";

export const sourceCatalogStorageKey = "source-catalog";

export async function loadSourceCatalog(): Promise<SourceCatalog> {
  const stored = await LocalStorage.getItem<string>(sourceCatalogStorageKey);
  const parsed = parseSourceCatalog(stored);
  if (parsed) return parsed;
  return reseedSourceCatalog();
}

export type SaveSourceCatalogResult = { kind: "saved"; catalog: SourceCatalog } | { kind: "invalid"; reason: string };

export async function saveSourceCatalog(sources: readonly StoredSource[]): Promise<SaveSourceCatalogResult> {
  if (!idsAreUnique(sources)) return { kind: "invalid", reason: "Source ids must be unique" };
  for (const row of sources) {
    const reason = validateSourceRow(row, sources);
    if (reason) return { kind: "invalid", reason };
  }

  const catalog: SourceCatalog = { version: sourceCatalogVersion, sources: sources.map((row) => ({ ...row })) };
  await LocalStorage.setItem(sourceCatalogStorageKey, JSON.stringify(catalog));
  return { kind: "saved", catalog };
}

async function reseedSourceCatalog(): Promise<SourceCatalog> {
  const catalog: SourceCatalog = { version: sourceCatalogVersion, sources: [{ ...seedSource }] };
  await LocalStorage.setItem(sourceCatalogStorageKey, JSON.stringify(catalog));
  return catalog;
}
