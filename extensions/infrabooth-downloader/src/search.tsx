import { ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { OnlineResults } from "./components/OnlineResults";
import { ResultsSection } from "./components/ResultsSection";
import { SearchTypeDropdown } from "./components/SearchTypeDropdown";
import { SwitchTypeAction } from "./components/SwitchTypeAction";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useLibraries } from "./hooks/useLibraries";
import { useOnlineSearch } from "./hooks/useOnlineSearch";
import { handleError } from "./lib/feedback";
import { prefetchSelectedPlaylist } from "./lib/prefetch";
import { fetchSearch, filterResults, SEARCH_TYPES, type SearchType, withoutLibraryPlaylists } from "./lib/searchTypes";

export default function Search() {
  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("tracks");
  const query = searchText.trim();
  const remoteQuery = useDebouncedValue(query, 300);

  const libraries = useLibraries();
  const online = useOnlineSearch(query, remoteQuery, searchType === "online");
  const search = useCachedPromise(fetchSearch, [searchType, remoteQuery], {
    execute: remoteQuery !== "" && SEARCH_TYPES[searchType].search !== undefined,
    keepPreviousData: true,
    onError: (error) => void handleError(error, "Search failed"),
  });

  const library = searchType === "online" ? undefined : libraries[searchType];
  const libraryResults = library && filterResults(library.results, query);
  const searchResults = withoutLibraryPlaylists(
    query !== "" && search.data?.kind === searchType ? search.data : undefined,
    libraryResults,
  );
  const isLoading = library ? library.isLoading || (query !== "" && search.isLoading) : online.isLoading;

  const current = SEARCH_TYPES[searchType];
  const switchActions = <SwitchTypeAction current={searchType} onSwitch={setSearchType} />;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={current.placeholder}
      onSearchTextChange={setSearchText}
      onSelectionChange={prefetchSelectedPlaylist}
      searchBarAccessory={<SearchTypeDropdown value={searchType} onChange={setSearchType} />}
    >
      {library ? (
        <>
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search SoundCloud…"
            description="Type to search SoundCloud."
            actions={<ActionPanel>{switchActions}</ActionPanel>}
          />
          <ResultsSection
            title={current.libraryTitle}
            results={libraryResults}
            playAsList
            extraActions={switchActions}
          />
          <ResultsSection title="SoundCloud" results={searchResults} playAsList={false} extraActions={switchActions} />
        </>
      ) : (
        <OnlineResults view={online.view} isLoading={online.isLoading} extraActions={switchActions} />
      )}
    </List>
  );
}
