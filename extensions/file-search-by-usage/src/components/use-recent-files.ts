import { useMemo } from "react";
import { selectRecentEntries } from "../lib/recent-files";
import { useCachedEntries } from "./use-cached-entries";
import { SearchSetup } from "./use-search-setup";
import { TypeFilter } from "../lib/query";

/** Only the active folder validates and retains matching recent entries. */
export function useRecentFiles(
  setup: SearchSetup,
  query: string,
  scope: string | undefined,
  showHidden: boolean,
  reloadKey: number,
  canonicalScope?: string,
  signal?: AbortSignal,
  typeFilter: TypeFilter = "all",
) {
  const candidates = useMemo(
    () =>
      selectRecentEntries(setup.seed, query, scope, showHidden, canonicalScope),
    [setup.seed, query, scope, showHidden, canonicalScope],
  );
  const checked = useCachedEntries(
    candidates,
    query,
    reloadKey,
    Infinity,
    signal,
    typeFilter,
  );
  return {
    ...setup,
    entries: checked.entries,
    pending: setup.loading || setup.importing || checked.pending,
    partial: checked.partial,
    limited: checked.limited,
  };
}
