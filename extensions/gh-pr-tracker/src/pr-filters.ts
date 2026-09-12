import { LocalStorage } from "@raycast/api";
import { compilePrFilterQuery, queryMightReferenceMe, type CompiledPrFilter } from "./pr-filter-query";
import { getViewerLogin } from "./viewer";
import { storeLog as log, getErrorMessage } from "./logger";

export interface PrFilter {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  updatedAt: string;
}

const FILTERS_KEY = "gh_pr_filters";
const ACTIVE_FILTER_KEY = "gh_pr_active_filter_id";

function isPrFilter(value: unknown): value is PrFilter {
  if (value == null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.query === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.updatedAt === "string"
  );
}

/** Saved PR filters. Corrupt or invalid storage resets to `[]`, never throws. */
export async function loadPrFilters(): Promise<PrFilter[]> {
  const raw = await LocalStorage.getItem<string>(FILTERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      log.warn("PR filters are not an array — resetting to empty");
      return [];
    }
    return parsed.filter(isPrFilter);
  } catch (error) {
    log.warn("PR filters are corrupt and were reset to empty", { error: getErrorMessage(error) });
    return [];
  }
}

export async function savePrFilters(filters: PrFilter[]): Promise<void> {
  await LocalStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}

/** `undefined` means "All Pull Requests" (no filter active). */
export async function loadActiveFilterId(): Promise<string | undefined> {
  const raw = await LocalStorage.getItem<string>(ACTIVE_FILTER_KEY);
  return raw && raw.length > 0 ? raw : undefined;
}

export async function saveActiveFilterId(id: string | undefined): Promise<void> {
  if (id) {
    await LocalStorage.setItem(ACTIVE_FILTER_KEY, id);
  } else {
    await LocalStorage.removeItem(ACTIVE_FILTER_KEY);
  }
}

/**
 * Loads active filter, resolves `@me` only if needed, and compiles it for downstream callers.
 * Returns `undefined` when no saved filter is active or it no longer exists.
 */
export async function resolveActivePrFilter(): Promise<CompiledPrFilter | undefined> {
  const activeId = await loadActiveFilterId();
  if (!activeId) return undefined;

  const filters = await loadPrFilters();
  const active = filters.find((filter) => filter.id === activeId);
  if (!active) return undefined;

  const viewerLogin = queryMightReferenceMe(active.query) ? await getViewerLogin() : undefined;
  return compilePrFilterQuery(active.query, viewerLogin);
}
