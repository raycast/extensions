import { useEffect, useState } from "react";
import useSearch from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";
import useAppExists, { UseAppExists } from "./hooks/useAppExists";
import useConfig, { UseConfig } from "./hooks/useConfig";
import useDB, { UseDB } from "./hooks/useDB";
import { CACHE_KEYS, APP_CONSTANTS } from "./constants";
import { Action, ActionPanel, List, showToast, Toast, openExtensionPreferences, Cache } from "@raycast/api";
import { getSearchPreferences } from "./preferences";
import useDocumentSearch from "./hooks/useDocumentSearch";
import ListDocBlocks from "./components/ListDocBlocks";
import Style = Toast.Style;

const cache = new Cache();

interface SpaceOption {
  id: string;
  title: string;
}

interface SpaceDropdownProps {
  value: string;
  spaces: SpaceOption[];
  onSpaceChange: (newValue: string) => void;
}

function SpaceDropdown({ value, spaces, onSpaceChange }: SpaceDropdownProps) {
  return (
    <List.Dropdown value={value} tooltip="Select Space" onChange={onSpaceChange}>
      <List.Dropdown.Section title="Spaces">
        <List.Dropdown.Item key="all" title="All spaces" value="all" />
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const { useDetailedView } = getSearchPreferences();

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<string>(
    cache.get(CACHE_KEYS.SEARCH_SPACE_ID) || APP_CONSTANTS.DEFAULT_SPACE_FILTER
  );

  const handleSpaceChange = (newValue: string) => {
    setSelectedSpace(newValue);
    cache.set(CACHE_KEYS.SEARCH_SPACE_ID, newValue);
  };

  const params = { appExists, db, query, setQuery, config, selectedSpace, handleSpaceChange };

  useEffect(() => {
    if (appExists.appExistsLoading) return;
    if (appExists.appExists) return;

    showToast(Style.Failure, "Error", "Craft app is not installed");
  }, [appExists.appExistsLoading]);

  // Reset to "all" if selected space no longer exists
  useEffect(() => {
    if (
      selectedSpace !== "all" &&
      config.config &&
      !config.config.getEnabledSpaces().find((s) => s.spaceID === selectedSpace)
    ) {
      handleSpaceChange("all");
    }
  }, [selectedSpace, config.config]);

  return useDetailedView ? handleDetailedView(params) : handleListView(params);
}

type ViewParams = {
  appExists: UseAppExists;
  db: UseDB;
  query: string;
  setQuery: (query: string) => void;
  config: UseConfig;
  selectedSpace: string;
  handleSpaceChange: (newValue: string) => void;
};

const handleListView = ({ appExists, db, query, setQuery, config, selectedSpace, handleSpaceChange }: ViewParams) => {
  const { resultsLoading, results } = useSearch(db, query);

  // Filter results by selected space
  const filteredResults =
    selectedSpace === "all"
      ? results?.filter((block) => config.config?.getEnabledSpaces().some((space) => space.spaceID === block.spaceID))
      : results?.filter((block) => block.spaceID === selectedSpace);

  const spaces = config.config?.getAllSpacesForDropdown() || [];
  const showSpaceDropdown = spaces.length > 1;

  const listBlocks = (
    <ListBlocks
      isLoading={resultsLoading}
      onSearchTextChange={setQuery}
      blocks={filteredResults}
      query={query}
      config={config.config}
      searchBarAccessory={
        showSpaceDropdown ? (
          <SpaceDropdown spaces={spaces} onSpaceChange={handleSpaceChange} value={selectedSpace} />
        ) : undefined
      }
    />
  );

  const listOrInfo = appExists.appExists ? listBlocks : <NoResults />;

  return appExists.appExistsLoading ? listBlocks : listOrInfo;
};

const handleDetailedView = ({
  appExists,
  db,
  query,
  setQuery,
  config,
  selectedSpace,
  handleSpaceChange,
}: ViewParams) => {
  const { resultsLoading, results } = useDocumentSearch(db, query);

  // Filter results by selected space
  const filteredResults =
    selectedSpace === "all"
      ? results?.filter((doc) => config.config?.getEnabledSpaces().some((space) => space.spaceID === doc.block.spaceID))
      : results?.filter((doc) => doc.block.spaceID === selectedSpace);

  const spaces = config.config?.getAllSpacesForDropdown() || [];
  const showSpaceDropdown = spaces.length > 1;

  const listDocuments = (
    <ListDocBlocks
      resultsLoading={resultsLoading}
      setQuery={setQuery}
      results={filteredResults}
      query={query}
      config={config.config}
      searchBarAccessory={
        showSpaceDropdown ? (
          <SpaceDropdown spaces={spaces} onSpaceChange={handleSpaceChange} value={selectedSpace} />
        ) : undefined
      }
    />
  );

  const listOrInfo = appExists.appExists ? listDocuments : <NoResults />;

  return appExists.appExistsLoading ? listDocuments : listOrInfo;
};

const NoResults = () => (
  <>
    <List
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No results"
        description="Selecting Craft application in preferences might help"
        icon={"command-icon-small.png"}
      />
    </List>
  </>
);
