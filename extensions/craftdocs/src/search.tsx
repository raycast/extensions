import { useState } from "react";
import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { CraftConfig } from "./Config";
import ListSpaceDropdown from "./components/ListSpaceDropdown";
import { CraftEnvironmentList, DatabaseIssueList } from "./components/CraftCommandState";
import ListBlocks from "./components/ListBlocks";
import ListDocBlocks from "./components/ListDocBlocks";
import { APP_CONSTANTS, CACHE_KEYS } from "./constants";
import useCraftCommandContext from "./hooks/useCraftCommandContext";
import useDocumentSearch from "./hooks/useDocumentSearch";
import usePersistedSpaceSelection from "./hooks/usePersistedSpaceSelection";
import useSearch from "./hooks/useSearch";
import { filterDatabasesBySpaceId, resolveCreateDocumentSpaceId } from "./lib/search";
import { getSearchPreferences } from "./preferences";

const { useDetailedView } = getSearchPreferences();

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const command = useCraftCommandContext({ includeDatabases: true });
  const [query, setQuery] = useState("");

  const availableSpaceIDs = new Set(command.db.databases.map((database) => database.spaceID));
  const spaces =
    command.config.config?.enabledSpaces
      .filter((space) => availableSpaceIDs.has(space.spaceID))
      .map((space) => ({
        id: space.spaceID,
        title: command.config.config?.getSpaceDisplayName(space.spaceID) || space.spaceID,
      })) || [];

  const { selectedSpaceId, setSelectedSpaceId } = usePersistedSpaceSelection({
    cacheKey: CACHE_KEYS.SEARCH_SPACE_ID,
    validSelections: spaces.map((space) => space.id),
    fallbackSelection: APP_CONSTANTS.DEFAULT_SPACE_FILTER,
    alwaysAllowedSelections: [APP_CONSTANTS.DEFAULT_SPACE_FILTER],
  });

  if (command.loading) {
    return <List isLoading={true} />;
  }

  if (!command.environment.environment || command.environment.environment.status !== "ready") {
    return <CraftEnvironmentList environment={command.environment.environment} />;
  }

  if (command.db.fatalIssue) {
    return <DatabaseIssueList issue={command.db.fatalIssue} />;
  }

  if (!command.config.config || command.config.config.enabledSpaces.length === 0) {
    return <NoSpaces />;
  }

  return useDetailedView ? (
    <DetailedResultsView
      config={command.config.config}
      databases={filterDatabasesBySpaceId(command.db.databases, selectedSpaceId)}
      query={query}
      selectedSpaceId={selectedSpaceId}
      setQuery={setQuery}
      setSelectedSpaceId={setSelectedSpaceId}
      spaces={spaces}
    />
  ) : (
    <BlockResultsView
      config={command.config.config}
      databases={filterDatabasesBySpaceId(command.db.databases, selectedSpaceId)}
      query={query}
      selectedSpaceId={selectedSpaceId}
      setQuery={setQuery}
      setSelectedSpaceId={setSelectedSpaceId}
      spaces={spaces}
    />
  );
}

type SearchViewProps = {
  config: CraftConfig;
  databases: ReturnType<typeof filterDatabasesBySpaceId>;
  query: string;
  selectedSpaceId: string;
  setQuery: (query: string) => void;
  setSelectedSpaceId: (spaceId: string) => void;
  spaces: Array<{ id: string; title: string }>;
};

const BlockResultsView = ({
  config,
  databases,
  query,
  selectedSpaceId,
  setQuery,
  setSelectedSpaceId,
  spaces,
}: SearchViewProps) => {
  const searchState = useSearch({ databases, databasesLoading: false, fatalIssue: null, issues: [] }, query);

  return (
    <ListBlocks
      isLoading={searchState.resultsLoading}
      onSearchTextChange={setQuery}
      blocks={searchState.results}
      query={query}
      config={config}
      createDocumentSpaceId={resolveCreateDocumentSpaceId({
        selectedSpaceId,
        primarySpaceId: config.primarySpace?.spaceID,
      })}
      searchBarAccessory={
        spaces.length > 1 ? (
          <ListSpaceDropdown spaces={spaces} onChange={setSelectedSpaceId} value={selectedSpaceId} includeAll={true} />
        ) : undefined
      }
    />
  );
};

const DetailedResultsView = ({
  config,
  databases,
  query,
  selectedSpaceId,
  setQuery,
  setSelectedSpaceId,
  spaces,
}: SearchViewProps) => {
  const searchState = useDocumentSearch({ databases, databasesLoading: false, fatalIssue: null, issues: [] }, query);

  return (
    <ListDocBlocks
      resultsLoading={searchState.resultsLoading}
      setQuery={setQuery}
      results={searchState.results}
      query={query}
      config={config}
      createDocumentSpaceId={resolveCreateDocumentSpaceId({
        selectedSpaceId,
        primarySpaceId: config.primarySpace?.spaceID,
      })}
      searchBarAccessory={
        spaces.length > 1 ? (
          <ListSpaceDropdown spaces={spaces} onChange={setSelectedSpaceId} value={selectedSpaceId} includeAll={true} />
        ) : undefined
      }
    />
  );
};

const NoSpaces = () => (
  <List
    actions={
      <ActionPanel>
        <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
      </ActionPanel>
    }
  >
    <List.EmptyView
      title="No Spaces found"
      description="Open Craft and let it finish syncing before searching."
      icon="command-icon-small.png"
    />
  </List>
);
