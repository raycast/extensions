import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import Actions from "./Actions";
import CodeSearchTableFilterDropdown, { TableFilterOption } from "./CodeSearchTableFilterDropdown";
import SearchCodeTableSection from "./SearchCodeTableSection";

import useInstances from "../hooks/useInstances";
import useSearchGroups, { DEFAULT_SEARCH_GROUP_SCOPE } from "../hooks/useSearchGroups";
import useCodeSearchTables from "../hooks/useCodeSearchTables";
import InstanceForm from "./InstanceForm";
import useFavorites from "../hooks/useFavorites";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { useAuthHeader } from "../hooks/useAuthHeader";

export default function SearchCodeResults({ searchTerm }: { searchTerm: string }) {
  const favorites = useFavorites();
  // useFavorites returns fresh function references on every render (the inner
  // functions aren't useCallback-wrapped). Stabilise them via a ref + stable
  // callbacks so React.memo on SearchCodeTableSection actually skips re-renders.
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const isInFavorites = useCallback((path: string) => favoritesRef.current.isInFavorites(path), []);
  const revalidateFavorites = useCallback(() => favoritesRef.current.revalidateFavorites(), []);
  const addUrlToFavorites = useCallback<typeof favorites.addUrlToFavorites>(
    (...args) => favoritesRef.current.addUrlToFavorites(...args),
    [],
  );
  const removeFromFavorites = useCallback<typeof favorites.removeFromFavorites>(
    (...args) => favoritesRef.current.removeFromFavorites(...args),
    [],
  );

  const { addInstance, mutate: mutateInstances, selectedInstance } = useInstances();
  const command = "Search Code";

  const [navigationTitle, setNavigationTitle] = useState<string>("");
  const { name: instanceName = "" } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);

  const [groupScope, setGroupScope] = useCachedState<string>("search-code-group-scope", DEFAULT_SEARCH_GROUP_SCOPE);
  const { isLoading: isLoadingGroups, groups: fetchedGroups } = useSearchGroups(selectedInstance);

  const selectedGroupSysId = fetchedGroups.find((g) => g.scope === groupScope)?.sysId ?? "";
  const { isLoading: isLoadingTables, tables } = useCodeSearchTables(selectedInstance, selectedGroupSysId);

  // The sn_codesearch API has no native pagination, so we fan out one request per
  // table in the selected search group (mirroring SN-Utils) by rendering a child
  // component per table. We cap concurrent in-flight requests with a sliding
  // window — 21 simultaneous responses with full match context blew the Raycast
  // worker's heap limit.
  const CONCURRENCY = 3;
  const [tablesCompleted, setTablesCompleted] = useState(0);
  const [maxActiveIndex, setMaxActiveIndex] = useState(CONCURRENCY);
  const [tableHits, setTableHits] = useState<Record<string, { label: string; count: number }>>({});
  const [tableFilter, setTableFilter] = useCachedState<string>("search-code-table-filter", "all");
  const ready =
    !isLoadingGroups && !isLoadingTables && !!selectedInstance && !!authHeader && !!searchTerm && tables.length > 0;

  // Reset the progress counter, the active window, and the per-table hit map
  // when the query changes so a new run starts at 0. Depend on `tables.length`
  // rather than `tables` itself — useFetch reassigns the array reference
  // whenever its cached state syncs, which would otherwise reset the counter on
  // every render and freeze us at "1/N".
  useEffect(() => {
    setTablesCompleted(0);
    setMaxActiveIndex(CONCURRENCY);
    setTableHits({});
  }, [searchTerm, groupScope, tables.length]);

  const onTableComplete = useCallback((table: string, hits: { label: string; count: number } | null) => {
    setTablesCompleted((prev) => prev + 1);
    setMaxActiveIndex((prev) => prev + 1);
    if (hits) {
      setTableHits((prev) => ({ ...prev, [table]: hits }));
    }
  }, []);

  const tableFilterOptions: TableFilterOption[] = useMemo(
    () =>
      Object.entries(tableHits)
        .map(([table, info]) => ({ table, label: info.label, count: info.count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tableHits],
  );

  const isSearching = isLoadingGroups || isLoadingTables || (ready && tablesCompleted < tables.length);
  const displayProgress = Math.min(tablesCompleted + 1, tables.length);

  useEffect(() => {
    if (!selectedInstance) {
      setNavigationTitle(command);
      return;
    }

    const aliasOrName = selectedInstance ? instanceLabel(selectedInstance) : instanceName;

    if (isLoadingGroups || isLoadingTables) {
      setNavigationTitle(`${command} > ${aliasOrName} > Discovering tables...`);
      return;
    }

    if (isSearching) {
      const progress = tables.length > 0 ? ` ${displayProgress}/${tables.length}` : "";
      setNavigationTitle(`${command} > ${aliasOrName} > Searching${progress} for ${searchTerm}...`);
      return;
    }
    const totalHits = Object.values(tableHits).reduce((sum, t) => sum + t.count, 0);
    if (totalHits === 0) {
      setNavigationTitle(`${command} > ${aliasOrName} > No results found for ${searchTerm}`);
    } else {
      setNavigationTitle(
        `${command} > ${aliasOrName} > ${totalHits} result${totalHits === 1 ? "" : "s"} for ${searchTerm}`,
      );
    }
  }, [
    selectedInstance,
    isSearching,
    isLoadingGroups,
    isLoadingTables,
    tableHits,
    tables.length,
    displayProgress,
    searchTerm,
    instanceName,
    selectedInstance,
  ]);

  // Used as React keys so children unmount/remount cleanly when the query changes,
  // ensuring each useFetch fires fresh against the new term/group.
  const runKey = `${searchTerm}|${groupScope}`;

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Filter by script name or table..."
      isLoading={isSearching}
      searchBarAccessory={
        <CodeSearchTableFilterDropdown
          tables={tableFilterOptions}
          value={tableFilter}
          onChange={setTableFilter}
          isLoading={isSearching}
        />
      }
    >
      {selectedInstance ? (
        ready ? (
          <>
            {tables.map((table, i) => (
              <SearchCodeTableSection
                key={`${runKey}|${table}`}
                active={i < maxActiveIndex}
                visible={tableFilter === "all" || tableFilter === table}
                instanceName={instanceName}
                instanceUrl={instanceUrl}
                authHeader={authHeader!}
                searchTerm={searchTerm}
                groupScope={groupScope}
                groups={fetchedGroups}
                onGroupScopeChange={setGroupScope}
                table={table}
                onComplete={onTableComplete}
                isInFavorites={isInFavorites}
                revalidateFavorites={revalidateFavorites}
                addUrlToFavorites={addUrlToFavorites}
                removeFromFavorites={removeFromFavorites}
              />
            ))}
            {isSearching && tablesCompleted === 0 && (
              <List.EmptyView
                icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
                title="Searching..."
                description={`Scanning ${displayProgress}/${tables.length} tables`}
              />
            )}
            {!isSearching && tablesCompleted > 0 && (
              // When the search has finished but no table produced hits, the List has
              // no <List.Section> children. Render an empty-state placeholder so the
              // user sees "No Results" instead of Raycast's default empty view.
              <List.EmptyView
                title="No Results"
                actions={
                  <ActionPanel>
                    <Actions revalidate={() => undefined} />
                  </ActionPanel>
                }
              />
            )}
          </>
        ) : (
          <List.EmptyView
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
            title="Searching..."
            description="Discovering tables"
          />
        )
      ) : (
        <List.EmptyView
          title="No Instance Profiles Found"
          description="Add an Instance Profile to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Instance Profile"
                target={<InstanceForm onSubmit={addInstance} />}
                onPop={mutateInstances}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
