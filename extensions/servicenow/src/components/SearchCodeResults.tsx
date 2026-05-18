import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import Actions from "./Actions";
import SearchCodeTableSection from "./SearchCodeTableSection";
import SearchGroupDropdown, { DEFAULT_SEARCH_GROUP_SCOPE } from "./SearchGroupDropdown";

import useInstances from "../hooks/useInstances";
import useSearchGroups from "../hooks/useSearchGroups";
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
  const ready =
    !isLoadingGroups && !isLoadingTables && !!selectedInstance && !!authHeader && !!searchTerm && tables.length > 0;

  // Reset the progress counter and the active window when the query changes so a
  // new run starts at 0. Depend on `tables.length` rather than `tables` itself —
  // useFetch reassigns the array reference whenever its cached state syncs, which
  // would otherwise reset the counter on every render and freeze us at "1/N".
  useEffect(() => {
    setTablesCompleted(0);
    setMaxActiveIndex(CONCURRENCY);
  }, [searchTerm, groupScope, tables.length]);

  const onTableComplete = useCallback(() => {
    setTablesCompleted((prev) => prev + 1);
    setMaxActiveIndex((prev) => prev + 1);
  }, []);

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
    setNavigationTitle(`${command} > ${aliasOrName} > ${tablesCompleted} tables scanned for ${searchTerm}`);
  }, [
    selectedInstance,
    isSearching,
    isLoadingGroups,
    isLoadingTables,
    tablesCompleted,
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
        <SearchGroupDropdown
          groups={fetchedGroups}
          isLoading={isLoadingGroups}
          value={groupScope}
          onChange={setGroupScope}
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
                instanceName={instanceName}
                instanceUrl={instanceUrl}
                authHeader={authHeader!}
                searchTerm={searchTerm}
                groupScope={groupScope}
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
