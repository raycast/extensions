import { useEffect, useState } from "react";

import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { useStats } from "@/hooks/useJSRAPI";
import { useJSRSearch } from "@/hooks/useJSRSearch";
import { useSelectedPackage } from "@/hooks/useSelectedPackage";

import ListItem from "@/components/ListItem";
import StatsSections from "@/components/StatsSections";

import OptionalActions from "./components/OptionalActions";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const { data, isLoading, error } = useJSRSearch(searchText);
  const { data: statsData, isLoading: statsIsLoading } = useStats();
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
      navigationTitle="Search JSR"
      searchBarPlaceholder="Search JSR packages"
      isLoading={isLoading || (searchText === "" && statsIsLoading)}
      onSelectionChange={setSelectedId}
    >
      <StatsSections
        statsData={statsData}
        enabled={searchText === ""}
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
}
