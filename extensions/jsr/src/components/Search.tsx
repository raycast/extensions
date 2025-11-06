import { useEffect, useState } from "react";

import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { useStats } from "@/hooks/jsrApi";
import { useJSRSearch } from "@/hooks/useJSRSearch";
import { useSelectedPackage } from "@/hooks/useSelectedPackage";

import ListItem from "@/components/ListItem";
import OptionalActions from "@/components/OptionalActions";
import StatsSections from "@/components/StatsSections";

type SearchProps = {
  scope: string | null;
};

const Search = ({ scope }: SearchProps) => {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const { data, isLoading, error } = useJSRSearch(searchText, scope);
  const { data: statsData, isLoading: statsIsLoading } = useStats(scope === null);
  const { selectedPackageData, selectedPackageError, selectedPageLoading, setSelectedId } = useSelectedPackage();
  const addExtraActions = !(selectedPageLoading || selectedPackageError || !selectedPackageData);

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch JSR search results", error);
      showFailureToast({
        title: "Error fetching JSR search results",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      filtering={false}
      isShowingDetail={isShowingDetails}
      throttle={true}
      onSearchTextChange={setSearchText}
      navigationTitle={scope ? `Search JSR Packages in '@${scope}'` : "Search JSR Packages"}
      searchBarPlaceholder={scope ? `Search JSR packages in '@${scope}'` : "Search JSR packages"}
      isLoading={isLoading || (searchText === "" && statsIsLoading)}
      onSelectionChange={setSelectedId}
    >
      <StatsSections
        statsData={statsData}
        enabled={searchText === "" && scope === null}
        setIsShowingDetails={setIsShowingDetails}
        isShowingDetails={isShowingDetails}
        extraActions={<OptionalActions selectedPackageData={selectedPackageData} enabled={addExtraActions} />}
      />
      {data?.map((result) => (
        <ListItem
          key={result.id}
          item={result.document}
          toggleDetails={() => {
            setIsShowingDetails((state) => !state);
          }}
          isShowingDetails={isShowingDetails}
          extraActions={<OptionalActions selectedPackageData={selectedPackageData} enabled={addExtraActions} />}
        />
      ))}
      <List.EmptyView
        title={searchText === "" ? "Search JSR Packages" : "No results found"}
        description={searchText !== "" ? "Try another search query" : ""}
        icon={{ source: "jsr.svg" }}
      />
    </List>
  );
};

export default Search;
