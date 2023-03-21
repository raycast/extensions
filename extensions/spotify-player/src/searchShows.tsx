import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useShowSearch } from "./spotify/client";
import ShowListItem from "./components/ShowListItem";
import { SpotifyProvider } from "./utils/context";

function SearchShows() {
  const [searchText, setSearchText] = useState<string>();
  const response = useShowSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search shows..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {response.result?.shows.items.map((p) => (
        <ShowListItem key={p.id} show={p} />
      ))}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <SearchShows />
  </SpotifyProvider>
);
