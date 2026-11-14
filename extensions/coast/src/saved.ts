import { LocalStorage } from "@raycast/api";
import { searchCapturePage, sampleActivity, type SearchArgs } from "./coast";
import { offsetDate, today } from "./dates";
import { pageItems, type PageInput } from "./pagination";

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  app: string;
  domain: string;
  days: string;
};
const storageKey = "saved-searches-v1";

export function savedDefinition(value: SavedSearch): SavedSearch {
  if (!value.name.trim()) throw new Error("Give this search a name.");
  if (!["1", "7", "30"].includes(value.days))
    throw new Error("Choose a supported time range.");
  return {
    id: value.id,
    name: value.name.trim(),
    query: value.query.trim(),
    app: value.app,
    domain: value.domain,
    days: value.days,
  };
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const raw = await LocalStorage.getItem<string>(storageKey);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed))
    throw new Error("Saved searches could not be read.");
  return parsed.map(savedDefinition);
}

export async function saveSearch(value: SavedSearch) {
  const definition = savedDefinition(value);
  const searches = await listSavedSearches();
  const next = [
    ...searches.filter((search) => search.id !== definition.id),
    definition,
  ];
  if (next.length > 50)
    throw new Error(
      "Keep up to 50 saved searches. Remove one before adding another.",
    );
  await LocalStorage.setItem(storageKey, JSON.stringify(next));
}

export async function removeSearch(id: string) {
  await LocalStorage.setItem(
    storageKey,
    JSON.stringify(
      (await listSavedSearches()).filter((search) => search.id !== id),
    ),
  );
}

export function savedScope(search: SavedSearch): SearchArgs {
  return {
    query: search.query,
    tr:
      search.days === "1"
        ? today()
        : `${offsetDate(Number(search.days) - 1)}|${today()}`,
    appFilters: search.app ? [search.app] : undefined,
    domainFilters: search.domain ? [search.domain] : undefined,
  };
}

export async function runSavedSearch(
  search: SavedSearch,
  input: PageInput & { tr?: string } = {},
) {
  const scope = {
    ...savedScope(search),
    ...(input.tr ? { tr: input.tr } : {}),
  };
  if (scope.query) {
    const page = await searchCapturePage({ ...scope, ...input });
    return {
      scope: page.scope,
      frames: page.results,
      pagination: page.pagination,
      coverage: page.coverage,
    };
  }
  const segments = await sampleActivity({ ...scope, tr: scope.tr! });
  const page = pageItems(
    segments.map((segment) => segment.selected_frame),
    input,
  );
  return {
    scope,
    frames: page.items,
    pagination: page.pagination,
    coverage:
      "One representative capture per Coast activity segment in the saved scope. Keep scope.tr on continuation. The live index is not a snapshot; delayed indexing can change results. Page through all selected segments for complete access to this sampled view.",
  };
}
