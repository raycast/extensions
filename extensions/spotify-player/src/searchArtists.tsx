import { List, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { useState } from "react";
import ArtistListItem from "./components/ArtistListItem";
import { SpotifyProvider } from "./utils/context";
import { useArtistsSearch } from "./spotify/client";

function SearchArtists() {
  const [searchText, setSearchText] = useState<string>();
  const response = useArtistsSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search artists..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
      isShowingDetail={!_(response.result?.artists.items).isEmpty()}
    >
      {response.result?.artists.items.map((t: SpotifyApi.ArtistObjectFull) => (
        <ArtistListItem key={t.id} artist={t} />
      ))}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <SearchArtists />
  </SpotifyProvider>
);
