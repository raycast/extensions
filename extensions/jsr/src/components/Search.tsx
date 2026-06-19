import { useCallback, useState } from "react";

import { Action, ActionPanel, List, useNavigation } from "@raycast/api";

import { useStats } from "@/hooks/jsrApi";
import { useJSRSearch } from "@/hooks/useJSRSearch";
import { useSelectedPackage } from "@/hooks/useSelectedPackage";

import ListItem from "@/components/ListItem";
import OptionalActions from "@/components/OptionalActions";
import StatsSections from "@/components/StatsSections";
import { SearchProvider } from "@/context/SearchContext";

type SearchProps = {
  scope: string | null;
};

const Search = ({ scope }: SearchProps) => {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const { push } = useNavigation();
  const { data, isLoading, searchQueryURL } = useJSRSearch(searchText, scope);
  const { data: statsData, isLoading: statsIsLoading } = useStats(scope === null);
  const { selectedPackageData, selectedPackageError, selectedPackageLoading, setSelectedId } = useSelectedPackage();
  const addExtraActions = !(selectedPackageLoading || selectedPackageError || !selectedPackageData);

  const openScope = useCallback(
    (nextScope: string) => {
      push(<Search scope={nextScope} />);
    },
    [push],
  );

  const toggleDetails = useCallback(() => {
    setIsShowingDetails((state) => !state);
  }, []);

  return (
    <SearchProvider
      openScope={openScope}
      searchQueryURL={searchQueryURL}
      isShowingDetails={isShowingDetails}
      toggleDetails={toggleDetails}
      extraActions={<OptionalActions selectedPackageData={selectedPackageData} enabled={addExtraActions} />}
    >
      <List
        filtering={false}
        isShowingDetail={isShowingDetails}
        throttle={true}
        onSearchTextChange={setSearchText}
        navigationTitle={scope ? `Search JSR Packages in '@${scope}'` : "Search JSR Packages"}
        searchBarPlaceholder={scope ? `Search JSR packages in '@${scope}'` : "Search JSR packages"}
        isLoading={isLoading || (searchText === "" && statsIsLoading)}
        onSelectionChange={setSelectedId}
        actions={
          searchQueryURL ? (
            <ActionPanel>
              <ActionPanel.Section title="Search">
                <Action.OpenInBrowser
                  title="Open Search (JSR)"
                  icon={{ source: "jsr.svg" }}
                  url={searchQueryURL}
                  shortcut={{ key: "w", modifiers: ["cmd", "shift"] }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          ) : null
        }
      >
        <StatsSections statsData={statsData} enabled={searchText === "" && scope === null} />
        {data?.map((result) => (
          <ListItem key={result.id} item={result.document} />
        ))}
        <List.EmptyView
          title={searchText === "" ? "Search JSR Packages" : "No results found"}
          description={searchText !== "" ? "Try another search query" : ""}
          icon={{ source: "jsr.svg" }}
        />
      </List>
    </SearchProvider>
  );
};

export default Search;
