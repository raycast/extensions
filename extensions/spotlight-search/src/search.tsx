import { Action, ActionPanel, List, Toast, showToast, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

import { searchSpotlight } from "./search-spotlight";

import { SpotlightSearchResult } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const [searchType, setSearchType] = useState(true);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!searchText) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      try {
        const spotlightSearchResults: SpotlightSearchResult[] = await searchSpotlight(searchText, searchType);

        setResults(spotlightSearchResults);
      } catch (_) {
        showToast({
          title: "An Error Occured",
          message: "Something went wrong. Try again.",
          style: Toast.Style.Failure,
        });
      }

      setIsLoading(false);
    })();
  }, [searchText, searchType]);

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="What would you like to search for?"
      searchBarAccessory={
        <List.Dropdown tooltip="Type" onChange={(type) => setSearchType(type === "true")}>
          <List.Dropdown.Item title="Folders" value="true"></List.Dropdown.Item>
          <List.Dropdown.Item title="Files" value="false"></List.Dropdown.Item>
        </List.Dropdown>
      }
    >
      {results.map((result: SpotlightSearchResult, resultIndex) => (
        <List.Item
          key={resultIndex}
          title={result.path.slice(0).split("/").pop() || "Untitled"}
          subtitle={[...result.path.split("/")]
            .filter((_, pathPartIndex) => pathPartIndex < [...result.path.split("/")].length - 1)
            .join("/")}
          icon={{ fileIcon: result.path }}
          actions={
            <ActionPanel>
              <Action.ShowInFinder
                title="Show in Finder"
                path={result.path}
                onShow={() => popToRoot({ clearSearchBar: true })}
              />
              <Action.CopyToClipboard
                title="Copy Path to Clipboard"
                content={result.path}
                onCopy={() => popToRoot({ clearSearchBar: true })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
