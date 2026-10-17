import { LocalStorage } from "@raycast/api";
import type { SearchRequest, WorkResult } from "../types";
import { normalizeSavedWork } from "./library-normalization";

const LIBRARY_KEY = "academic.library.v1";
const LIBRARY_NAMES_KEY = "academic.library-names.v1";
const HISTORY_KEY = "academic.search-history.v1";

export type SavedWork = {
  work: WorkResult;
  savedAt: string;
  collection: string;
  tags: string[];
};
export type SearchHistoryItem = { request: SearchRequest; searchedAt: string };

export async function loadLibrary(): Promise<SavedWork[]> {
  const value = await LocalStorage.getItem<string>(LIBRARY_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map(normalizeSavedWork).filter(isDefined)
      : [];
  } catch {
    return [];
  }
}

export async function saveWork(
  work: WorkResult,
  collection = "Reading List",
  tags: string[] = [],
): Promise<void> {
  await createLibrary(collection);
  const items = await loadLibrary();
  const next: SavedWork = {
    work,
    savedAt: new Date().toISOString(),
    collection,
    tags,
  };
  const existing = items.findIndex(
    (item) =>
      item.work.id === work.id || samePrimaryIdentifier(item.work, work),
  );
  if (existing >= 0) items[existing] = next;
  else items.unshift(next);
  await LocalStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

export async function removeWork(id: string): Promise<void> {
  const items = await loadLibrary();
  await LocalStorage.setItem(
    LIBRARY_KEY,
    JSON.stringify(items.filter((item) => item.work.id !== id)),
  );
}

export async function updateSavedWork(
  id: string,
  collection: string,
  tags: string[],
): Promise<void> {
  const items = await loadLibrary();
  const item = items.find((entry) => entry.work.id === id);
  if (item) {
    item.collection = collection.trim() || "Reading List";
    item.tags = tags;
    await createLibrary(item.collection);
  }
  await LocalStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

export async function loadSearchHistory(): Promise<SearchHistoryItem[]> {
  const value = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as SearchHistoryItem[];
  } catch {
    return [];
  }
}

export async function recordSearch(request: SearchRequest): Promise<void> {
  const history = await loadSearchHistory();
  const key = JSON.stringify(request);
  const next = [
    { request, searchedAt: new Date().toISOString() },
    ...history.filter((item) => JSON.stringify(item.request) !== key),
  ].slice(0, 40);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function clearSearchHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function loadLibraryNames(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(LIBRARY_NAMES_KEY);
  let names: string[] = [];
  try {
    names = stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    names = [];
  }
  const items = await loadLibrary();
  return [
    ...new Set(
      ["Reading List", ...names, ...items.map((item) => item.collection)]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export async function createLibrary(name: string): Promise<string> {
  const normalized = name.trim() || "Reading List";
  const names = await loadLibraryNames();
  await LocalStorage.setItem(
    LIBRARY_NAMES_KEY,
    JSON.stringify(
      [...new Set([...names, normalized])].sort((left, right) =>
        left.localeCompare(right),
      ),
    ),
  );
  return normalized;
}

export async function deleteLibrary(name: string): Promise<void> {
  if (name === "Reading List") return;
  const [items, names] = await Promise.all([loadLibrary(), loadLibraryNames()]);
  await Promise.all([
    LocalStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify(items.filter((item) => item.collection !== name)),
    ),
    LocalStorage.setItem(
      LIBRARY_NAMES_KEY,
      JSON.stringify(names.filter((candidate) => candidate !== name)),
    ),
  ]);
}

export async function exportLibraryJson(library?: string): Promise<string> {
  const [libraries, works] = await Promise.all([
    loadLibraryNames(),
    loadLibrary(),
  ]);
  return JSON.stringify(
    {
      format: "academic-library",
      version: 1,
      exportedAt: new Date().toISOString(),
      libraries: library ? [library] : libraries,
      works: library
        ? works.filter((entry) => entry.collection === library)
        : works,
    },
    null,
    2,
  );
}

export async function importLibraryJson(
  value: string,
): Promise<{ libraries: number; works: number }> {
  const parsed: unknown = JSON.parse(value);
  const exported = isRecord(parsed) ? parsed : undefined;
  if (
    !Array.isArray(parsed) &&
    (!exported || exported.format !== "academic-library")
  )
    throw new Error("Not an Academic library export");
  const incoming = Array.isArray(parsed)
    ? parsed
    : Array.isArray(exported?.works)
      ? exported.works
      : [];
  const valid = incoming.map(normalizeSavedWork).filter(isDefined);
  const existing = await loadLibrary();
  for (const entry of valid) {
    const index = existing.findIndex(
      (item) =>
        item.work.id === entry.work.id ||
        samePrimaryIdentifier(item.work, entry.work),
    );
    if (index >= 0) existing[index] = entry;
    else existing.push(entry);
  }
  const declared =
    !Array.isArray(parsed) && Array.isArray(exported?.libraries)
      ? exported.libraries.filter(
          (name): name is string => typeof name === "string",
        )
      : [];
  const libraries = [
    ...new Set([
      ...(await loadLibraryNames()),
      ...declared,
      ...valid.map((entry) => entry.collection),
    ]),
  ];
  await Promise.all([
    LocalStorage.setItem(LIBRARY_KEY, JSON.stringify(existing)),
    LocalStorage.setItem(LIBRARY_NAMES_KEY, JSON.stringify(libraries)),
  ]);
  return { libraries: libraries.length, works: valid.length };
}

function samePrimaryIdentifier(left: WorkResult, right: WorkResult): boolean {
  return (
    Boolean(
      left.identifiers.doi && left.identifiers.doi === right.identifiers.doi,
    ) ||
    Boolean(
      left.identifiers.isbn?.[0] &&
      right.identifiers.isbn?.includes(left.identifiers.isbn[0]),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
