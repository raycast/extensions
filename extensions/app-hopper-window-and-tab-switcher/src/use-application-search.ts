import { useCachedState } from "@raycast/utils";
import { useMemo } from "react";
import { arrangeApplications, type AppListOrder } from "./app-groups";
import { searchTerms } from "./helpers/search";
import { useListSearch } from "./helpers/use-list-search";
import { useStableResults, type ResultGroup } from "./helpers/use-stable-results";
import { compareSearchResults, resolveSearchResult, searchApplications, type SearchResult } from "./search-results";
import type { AppWindowData } from "./app-window-evidence";
import type { AppGroup } from "./windows";

interface ApplicationSearchOptions {
  apps: AppGroup[];
  data: AppWindowData;
  onRefresh: () => void;
}

function groupSearchResults(results: SearchResult[]): ResultGroup<SearchResult>[] {
  return [
    { id: "search:applications", title: "Applications", items: results.filter((result) => result.kind === "app") },
    { id: "search:content", title: "Tabs and Windows", items: results.filter((result) => result.kind !== "app") },
  ];
}

/** Keep ranked search and arranged app browsing attached to the exact selected target. */
export function useApplicationSearch({ apps, data, onRefresh }: ApplicationSearchOptions) {
  const { browserTabs, browserCounts, axWindowsByPid } = data;
  const search = useListSearch();
  const [listOrder, setListOrder] = useCachedState<AppListOrder>("app-list-order", "recent");
  const appGroups = useMemo<ResultGroup<SearchResult>[]>(
    () =>
      arrangeApplications(apps, listOrder, { browserTabs, browserCounts, axWindowsByPid }).map((section) => ({
        id: section.id,
        title: section.title,
        items: section.apps.map((app) => ({ kind: "app", id: app.id, app, score: 0 })),
      })),
    [apps, listOrder, browserTabs, browserCounts, axWindowsByPid],
  );
  const groupsForQuery = useMemo(() => {
    let previous: { query: string; groups: ResultGroup<SearchResult>[] } | undefined;
    return (query: string) => {
      if (previous?.query === query) return previous.groups;
      const groups = searchTerms(query).length
        ? groupSearchResults(searchApplications(apps, query, browserTabs, axWindowsByPid))
        : appGroups;
      previous = { query, groups };
      return groups;
    };
  }, [apps, browserTabs, axWindowsByPid, appGroups]);
  const groups = useMemo(() => groupsForQuery(search.searchText), [groupsForQuery, search.searchText]);
  const hasQuery = searchTerms(search.searchText).length > 0;
  const matchesById = useMemo(
    () => new Map(groups.flatMap((group) => group.items.map((item) => [item.id, item]))),
    [groups],
  );
  const context = (query: string) => JSON.stringify([listOrder, query]);
  const stableResults = useStableResults(
    groups,
    context(search.searchText),
    (item) => {
      if (hasQuery) {
        const match = matchesById.get(item.id);
        if (match) return match;
        if (item.id !== search.selectedItemId) return undefined;
      }
      return resolveSearchResult(item, apps, browserTabs, axWindowsByPid);
    },
    search.selectedItemId,
    hasQuery ? compareSearchResults : undefined,
  );

  function onSearchTextChange(value: string) {
    search.onSearchTextChange(value);
    // Retain target identities for selection recovery; search ranking stays live.
    stableResults.hold(groupsForQuery(value), context(value));
  }

  function onSelectionChange(id: string | null) {
    search.onSelectionChange(id);
    if (id && id !== search.selectedItemId) stableResults.hold();
  }

  function releaseResults() {
    stableResults.release();
    search.onSelectionChange(null);
  }

  function onArrangementChange(value: string) {
    setListOrder(value as AppListOrder);
    releaseResults();
  }

  function refresh() {
    releaseResults();
    onRefresh();
  }

  return {
    groups: stableResults.groups,
    hasQuery,
    hasResults: stableResults.groups.some((group) => group.items.length > 0),
    listProps: {
      searchText: search.searchText,
      selectedItemId: search.selectedItemId,
      onSearchTextChange,
      onSelectionChange,
    },
    arrangement: { value: listOrder, onChange: onArrangementChange },
    refresh,
  };
}
