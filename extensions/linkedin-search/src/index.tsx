import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const handleSearch = () => {
    // Empty implementation as OpenInBrowser will handle the navigation
  };

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search LinkedIn..."
      navigationTitle="Search LinkedIn"
      enableFiltering={false}
    >
      {searchText ? (
        <List.Item
          title={searchText}
          subtitle="Press Enter to search"
          icon={{ source: Icon.MagnifyingGlass, tintColor: "#0A66C2" }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search on LinkedIn"
                url={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(searchText)}`}
                onOpen={handleSearch}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: "#0A66C2" }}
          title="Search LinkedIn"
          description="Type your search query above"
        />
      )}
    </List>
  );
}
