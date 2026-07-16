import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { AddRootForm } from "../components/AddRootForm";
import { ManageRootsView } from "../components/ManageRootsView";
import { RepositoryListItem } from "../components/RepositoryListItem";
import { useRepositoryStore } from "../hooks/useRepositoryStore";
import { loadPreferences } from "../preferences/preferences";
import { searchRepositories } from "../search/search";

/**
 * The `Search Repositories` command. It wires the repository store hook to the
 * search layer and renders results. All heavy lifting (discovery, git, ranking)
 * lives behind the hook and the search module; this component only orchestrates
 * state and presentation. See docs/ARCHITECTURE.md.
 */
export default function SearchRepositories(): React.JSX.Element {
  const store = useRepositoryStore();
  const preferences = useMemo(() => loadPreferences(), []);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const nowMs = Date.now();
  const results = useMemo(
    () => searchRepositories(searchText, store.records, store.userData, { nowMs }),
    // `nowMs` intentionally excluded: recomputing on every clock tick is wasteful
    // and ranking is insensitive to sub-second changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchText, store.records, store.userData],
  );

  const openManager = () =>
    push(
      <ManageRootsView
        storedRoots={store.storedRoots}
        preferenceRoots={store.preferenceRoots}
        onAdd={store.addRoots}
        onRemove={store.removeRoot}
      />,
    );

  // Wait for the initial cache + roots load so we never flash the wrong state.
  if (!store.isReady) {
    return <List isLoading searchBarPlaceholder="Search Git repositories…" />;
  }

  // Opt-in scanning: if no folders are configured, let the user pick them right
  // here — no trip to preferences required. See ADR-010 / ADR-011.
  if (store.effectiveRoots.length === 0) {
    return (
      <List searchBarPlaceholder="Search Git repositories…">
        <List.EmptyView
          icon={Icon.Folder}
          title="Choose folders to search"
          description="RepoScout doesn't scan your whole Mac. Pick one or more folders (e.g. ~/code) and it will index just those."
          actions={
            <ActionPanel>
              <Action
                title="Add Folder…"
                icon={Icon.Plus}
                onAction={() => push(<AddRootForm onAdd={store.addRoots} />)}
              />
              <Action title="Manage Search Folders" icon={Icon.Folder} onAction={openManager} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const showEmptyState = !store.isRefreshing && store.records.length === 0;

  return (
    <List
      isLoading={store.isRefreshing && store.records.length === 0}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Git repositories…"
      throttle
    >
      {showEmptyState ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No repositories found"
          description={
            store.error
              ? `Indexing failed: ${store.error}`
              : "No Git repositories in your chosen folders yet."
          }
          actions={
            <ActionPanel>
              <Action title="Manage Search Folders" icon={Icon.Folder} onAction={openManager} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={store.refresh} />
            </ActionPanel>
          }
        />
      ) : (
        results.map((result) => (
          <RepositoryListItem
            key={result.record.path}
            result={result}
            primaryEditor={preferences.primaryEditor}
            terminalApp={preferences.terminalApp}
            nowMs={nowMs}
            onOpen={store.recordOpen}
            onToggleFavorite={store.toggleFavorite}
            onTogglePin={store.togglePin}
            onRefresh={store.refresh}
            onManageRoots={openManager}
          />
        ))
      )}
    </List>
  );
}
