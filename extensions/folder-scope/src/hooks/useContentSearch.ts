import { useCallback, useEffect, useMemo, useState } from "react";
import { createSearchEngines } from "../services/search-engines";
import { IDLE_STATE, SearchRunner, type SearchState } from "../services/search-runner";
import type { ExtensionPreferences } from "../types/preferences";
import type { SearchOptions } from "../types/search";

/**
 * Typeahead search state. `options` must be referentially stable (hold it in
 * state) — a new object identity cancels the running search and restarts it.
 */
export function useContentSearch(directory: string | null, options: SearchOptions, preferences: ExtensionPreferences) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>(IDLE_STATE);

  const runner = useMemo(
    () => new SearchRunner(createSearchEngines(preferences.preferredEngine), preferences.debounceMs, setState),
    [preferences.preferredEngine, preferences.debounceMs],
  );

  useEffect(() => () => runner.dispose(), [runner]);
  useEffect(() => runner.search(query, directory, options), [runner, query, directory, options]);

  return {
    ...state,
    query,
    setQuery,
    refresh: useCallback(() => runner.refresh(), [runner]),
  };
}
