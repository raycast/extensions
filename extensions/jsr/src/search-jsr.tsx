import { useEffect, useState } from "react";

import { List, Toast, showToast } from "@raycast/api";

import { packageToSearchResultDocument } from "@/lib/convert";

import useJSRAPIStats from "@/hooks/useJSRAPIStats";
import useJSRSearch from "@/hooks/useJSRSearch";

import ListItem from "@/components/ListItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetails, setIsShowingDetails] = useState(false);

  const { data, isLoading, error } = useJSRSearch(searchText);
  const { data: statsData, isLoading: statsIsLoading } = useJSRAPIStats();

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch JSR search results", error);
      showToast({
        style: Toast.Style.Failure,
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
    >
      {searchText === "" && statsData ? (
        <>
          <List.Section title="Featured">
            {statsData.featured.map((result) => (
              <ListItem
                key={`featured/${result.scope}/${result.name}`}
                item={packageToSearchResultDocument(result)}
                toggleDetails={() => {
                  setIsShowingDetails((state) => !state);
                }}
                isShowingDetails={isShowingDetails}
              />
            ))}
          </List.Section>
          <List.Section title="Newest">
            {statsData.newest.map((result) => (
              <ListItem
                key={`newest/${result.scope}/${result.name}`}
                item={packageToSearchResultDocument(result)}
                toggleDetails={() => {
                  setIsShowingDetails((state) => !state);
                }}
                isShowingDetails={isShowingDetails}
              />
            ))}
          </List.Section>
        </>
      ) : null}
      {data?.map((result) => (
        <ListItem
          key={result.id}
          item={result.document}
          toggleDetails={() => {
            setIsShowingDetails((state) => !state);
          }}
          isShowingDetails={isShowingDetails}
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
